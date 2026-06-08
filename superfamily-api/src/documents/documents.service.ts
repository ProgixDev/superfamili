import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConsentsService } from '../consents/consents.service';

/**
 * Allowed document types. Single source of truth — mirrors the enum created
 * by the educator document migrations.
 */
export type DocumentType =
  | 'background_check'
  | 'birth_certificate'
  | 'cpr_certification'
  | 'work_authorization'
  | 'secondary_id'
  | 'diploma';

export type DocumentStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

/**
 * DB row shape — what the service returns for educator-facing reads. The
 * `signed_url` field is populated on demand for reads; it's not a column.
 */
export interface DocumentRow {
  id: string;
  educator_id: string;
  document_type: DocumentType;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  status: DocumentStatus;
  issued_date: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Populated on read endpoints. Never persisted. */
  signed_url?: string | null;
}

/** Bucket name — keep in sync with the migration. */
const BUCKET = 'educator-documents';

/** 10 MB (matches the `file_size_limit` on the bucket). */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Mirror of the `allowed_mime_types` field on the bucket. */
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Signed-URL lifetime, in seconds. Spec: 1 hour, regenerated on demand. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** How far ahead the expiry cron warns educators. 30 days per spec. */
export const EXPIRY_WARNING_WINDOW_DAYS = 30;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly consentsService: ConsentsService,
  ) {}

  // ─── Upload (educator) ────────────────────────────────────────────────

  /**
   * Handles an educator document upload end-to-end:
   *
   *   1. Validate file (size + mime).
   *   2. Resolve the educator_profile_id from the authenticated user.
   *   3. Validate `issued_date` presence for types that need it.
   *   4. Stream the file into the `educator-documents` bucket at
   *      `{educator_id}/{document_type}/{uuid}.{ext}`.
   *   5. Insert a row with `status = 'pending_review'` and computed
   *      `expires_at`.
   *   6. Return the new row (without a signed URL — frontend refetches via
   *      `listMine` which includes one).
   */
  async uploadDocument(
    profileId: string,
    file: Express.Multer.File | undefined,
    body: {
      type: DocumentType;
      issued_date?: string;
    },
  ): Promise<DocumentRow> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    this.validateFile(file);

    // Consent gate — the background check document requires an explicit
    // storage consent (Loi 25). The other types don't — the generic
    // terms-of-use / privacy-policy consent covers them. This check is
    // defense in depth; the frontend blocks the upload first.
    if (body.type === 'background_check') {
      await this.consentsService.requireConsent(
        profileId,
        'background_check_storage',
      );
    }

    // Per-type issued_date validation.
    if (
      (body.type === 'background_check' || body.type === 'cpr_certification') &&
      !body.issued_date
    ) {
      throw new BadRequestException(
        "La date d'émission est requise pour ce type de document.",
      );
    }

    // Background check must be dated within the last 6 months — reject
    // anything older at upload time so the educator doesn't waste a slot.
    if (body.type === 'background_check' && body.issued_date) {
      const issued = new Date(body.issued_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (issued < sixMonthsAgo) {
        throw new BadRequestException(
          "L'attestation d'antécédents judiciaires doit dater de moins de 6 mois.",
        );
      }
    }

    const educatorId = await this.resolveEducatorId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    // ── Upload to Storage ──────────────────────────────────────────────
    const ext = this.pickExtension(file);
    const storageKey = `${educatorId}/${body.type}/${randomUUID()}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(
        `Storage upload failed for educator ${educatorId}: ${uploadError.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors du téléversement du fichier.',
      );
    }

    // ── Compute expires_at ─────────────────────────────────────────────
    const expiresAt = this.computeExpiresAt(body.type, body.issued_date);

    // ── Insert the row ─────────────────────────────────────────────────
    const { data, error: insertError } = await supabase
      .from('educator_documents')
      .insert({
        educator_id: educatorId,
        document_type: body.type,
        file_url: storageKey,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        status: 'pending_review',
        issued_date: body.issued_date ?? null,
        expires_at: expiresAt?.toISOString() ?? null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      this.logger.error(
        `educator_documents insert failed: ${insertError?.message ?? 'unknown'}`,
      );
      // Best-effort cleanup of the orphaned file so Storage doesn't drift
      // from the DB. Failure to clean up is logged but non-fatal.
      await supabase.storage
        .from(BUCKET)
        .remove([storageKey])
        .then(() => undefined)
        .catch((err) =>
          this.logger.warn(
            `Orphaned file cleanup failed (${storageKey}): ${err}`,
          ),
        );
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement du document.",
      );
    }

    return data as DocumentRow;
  }

  // ─── List mine (educator) ─────────────────────────────────────────────

  /**
   * Returns every document for the authenticated educator, newest first.
   * Each row includes a `signed_url` good for 1 hour so the frontend can
   * show a preview / download link without another round-trip.
   */
  async listMine(profileId: string): Promise<DocumentRow[]> {
    const educatorId = await this.resolveEducatorId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_documents')
      .select('*')
      .eq('educator_id', educatorId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(
        `educator_documents list failed for educator ${educatorId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération de vos documents.',
      );
    }

    return this.attachSignedUrls((data ?? []) as DocumentRow[]);
  }

  // ─── Delete mine (educator, only if still pending_review) ────────────

  async deleteMine(profileId: string, documentId: string): Promise<void> {
    const educatorId = await this.resolveEducatorId(profileId);
    const supabase = this.supabaseService.getServiceClient();

    const { data: doc, error: fetchError } = await supabase
      .from('educator_documents')
      .select('id, educator_id, status, file_url')
      .eq('id', documentId)
      .maybeSingle();

    if (fetchError) {
      this.logger.error(
        `educator_documents lookup failed for ${documentId}: ${fetchError.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération du document.',
      );
    }
    if (!doc) {
      throw new NotFoundException('Document introuvable.');
    }
    if (doc.educator_id !== educatorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer ce document.",
      );
    }
    if (doc.status !== 'pending_review') {
      throw new BadRequestException(
        'Seuls les documents en attente de révision peuvent être supprimés.',
      );
    }

    // Delete the row first; orphaned file cleanup after. If the row delete
    // fails we keep the file — worst case is a dangling file, not a dangling
    // row pointing at nothing.
    const { error: deleteRowError } = await supabase
      .from('educator_documents')
      .delete()
      .eq('id', documentId);

    if (deleteRowError) {
      this.logger.error(
        `educator_documents delete failed for ${documentId}: ${deleteRowError.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la suppression du document.',
      );
    }

    await supabase.storage
      .from(BUCKET)
      .remove([doc.file_url])
      .then(() => undefined)
      .catch((err) =>
        this.logger.warn(
          `Storage cleanup failed after row delete (${doc.file_url}): ${err}`,
        ),
      );
  }

  // ─── Admin: list pending ──────────────────────────────────────────────

  async listForAdmin(params: {
    status?: DocumentStatus;
    type?: DocumentType;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const supabase = this.supabaseService.getServiceClient();

    let query = supabase
      .from('educator_documents')
      .select(
        `*,
         educator_profiles!inner(
           id,
           profile_id,
           profiles!educator_profiles_profile_id_fkey(first_name, last_name, email)
         )`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (params.status) {
      query = query.eq('status', params.status);
    } else {
      // Default the admin queue to "pending_review" — that's the most
      // common use.
      query = query.eq('status', 'pending_review');
    }
    if (params.type) {
      query = query.eq('document_type', params.type);
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(
        `admin educator_documents list failed: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des documents.',
      );
    }

    const withSigned = await this.attachSignedUrls(
      (data ?? []) as DocumentRow[],
    );

    return {
      data: withSigned,
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  // ─── Admin: approve ───────────────────────────────────────────────────

  async approve(
    documentId: string,
    adminProfileId: string,
  ): Promise<DocumentRow> {
    const supabase = this.supabaseService.getServiceClient();

    const current = await this.loadForAdminAction(documentId);
    if (current.status !== 'pending_review') {
      throw new BadRequestException(
        `Ce document n'est pas en attente de révision (statut actuel : ${current.status}).`,
      );
    }

    const { data, error } = await supabase
      .from('educator_documents')
      .update({
        status: 'approved',
        reviewed_by: adminProfileId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(
        `educator_documents approve failed for ${documentId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        "Erreur lors de l'approbation du document.",
      );
    }

    await this.notifyEducator(
      current.educator_id,
      'Document approuvé',
      `Votre ${this.documentTypeLabel(current.document_type)} a été approuvé.`,
    );

    return data as DocumentRow;
  }

  // ─── Admin: reject ────────────────────────────────────────────────────

  async reject(
    documentId: string,
    adminProfileId: string,
    reason: string,
  ): Promise<DocumentRow> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Une raison de rejet est requise.');
    }

    const supabase = this.supabaseService.getServiceClient();

    const current = await this.loadForAdminAction(documentId);
    if (current.status !== 'pending_review') {
      throw new BadRequestException(
        `Ce document n'est pas en attente de révision (statut actuel : ${current.status}).`,
      );
    }

    const { data, error } = await supabase
      .from('educator_documents')
      .update({
        status: 'rejected',
        reviewed_by: adminProfileId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (error || !data) {
      this.logger.error(
        `educator_documents reject failed for ${documentId}: ${error?.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors du rejet du document.',
      );
    }

    await this.notifyEducator(
      current.educator_id,
      'Document rejeté',
      `Votre ${this.documentTypeLabel(current.document_type)} a été rejeté. Raison : ${reason.trim()}`,
    );

    return data as DocumentRow;
  }

  // ─── Cron support: expiring-soon sweep ───────────────────────────────

  /**
   * Returns every approved document whose `expires_at` is within
   * `EXPIRY_WARNING_WINDOW_DAYS` of now (inclusive). Called by the cron in
   * `DocumentsExpiryService`.
   */
  async findExpiringSoon(): Promise<DocumentRow[]> {
    const supabase = this.supabaseService.getServiceClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + EXPIRY_WARNING_WINDOW_DAYS);

    const { data, error } = await supabase
      .from('educator_documents')
      .select('*')
      .eq('status', 'approved')
      .not('expires_at', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .lt('expires_at', cutoff.toISOString());

    if (error) {
      this.logger.error(`findExpiringSoon query failed: ${error.message}`);
      return [];
    }
    return (data ?? []) as DocumentRow[];
  }

  /**
   * Returns every document whose `expires_at` is in the past, still flagged
   * as approved. The cron flips them to `status = 'expired'` in one batch.
   */
  async findNewlyExpired(): Promise<DocumentRow[]> {
    const supabase = this.supabaseService.getServiceClient();

    const { data, error } = await supabase
      .from('educator_documents')
      .select('*')
      .eq('status', 'approved')
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date().toISOString());

    if (error) {
      this.logger.error(`findNewlyExpired query failed: ${error.message}`);
      return [];
    }
    return (data ?? []) as DocumentRow[];
  }

  /** Marks the given rows as `expired` in one update. Used by the cron. */
  async markExpired(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = this.supabaseService.getServiceClient();

    const { error } = await supabase
      .from('educator_documents')
      .update({ status: 'expired' })
      .in('id', ids);

    if (error) {
      this.logger.error(`markExpired failed: ${error.message}`);
    }
  }

  /** Cron helper — used for both the 30-day warning and the 0-day flip. */
  async notifyEducatorForDocument(
    row: DocumentRow,
    title: string,
    message: string,
  ): Promise<void> {
    await this.notifyEducator(row.educator_id, title, message);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Fichier trop volumineux. Taille maximale : 10 Mo.',
      );
    }
    if (!(ALLOWED_MIMES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException(
        'Type de fichier non autorisé. Utilisez PDF, JPG, PNG ou WebP.',
      );
    }
  }

  private pickExtension(file: Express.Multer.File): string {
    // Prefer the mime type over the original filename — attackers can
    // rename a .exe to .pdf but can't change what multer detected. This
    // avoids path-traversal via weird filename extensions.
    switch (file.mimetype) {
      case 'application/pdf':
        return '.pdf';
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private computeExpiresAt(
    type: DocumentType,
    issuedDate: string | undefined,
  ): Date | null {
    if (!issuedDate) return null;
    const issued = new Date(issuedDate);
    const out = new Date(issued);
    switch (type) {
      case 'background_check':
        out.setMonth(out.getMonth() + 6);
        return out;
      case 'cpr_certification':
        out.setFullYear(out.getFullYear() + 3);
        return out;
      case 'birth_certificate':
      case 'work_authorization':
      case 'secondary_id':
      case 'diploma':
        return null;
      default:
        return null;
    }
  }

  /**
   * Turns a list of document rows into the same list with a 1-hour signed
   * URL attached to each. Signed URLs are regenerated on every read —
   * never cached in the row.
   */
  private async attachSignedUrls(rows: DocumentRow[]): Promise<DocumentRow[]> {
    const supabase = this.supabaseService.getServiceClient();

    return Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(row.file_url, SIGNED_URL_TTL_SECONDS);
        return { ...row, signed_url: signed?.signedUrl ?? null };
      }),
    );
  }

  private async resolveEducatorId(profileId: string): Promise<string> {
    if (!profileId) {
      throw new ForbiddenException('Profil utilisateur introuvable.');
    }
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `educator_profiles lookup failed for ${profileId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la vérification du profil.',
      );
    }
    if (!data) {
      throw new ForbiddenException(
        'Aucun profil éducateur associé à ce compte.',
      );
    }
    return data.id as string;
  }

  private async loadForAdminAction(documentId: string): Promise<DocumentRow> {
    const supabase = this.supabaseService.getServiceClient();
    const { data, error } = await supabase
      .from('educator_documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `educator_documents load failed for ${documentId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la récupération du document.',
      );
    }
    if (!data) {
      throw new NotFoundException('Document introuvable.');
    }
    return data as DocumentRow;
  }

  /**
   * Sends an in-app notification to the educator identified by
   * `educator_profiles.id`. Resolves to `profiles.id` first because the
   * notifications table is keyed on profile_id, not educator_profile_id.
   */
  private async notifyEducator(
    educatorId: string,
    title: string,
    message: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getServiceClient();
    const { data: ep } = await supabase
      .from('educator_profiles')
      .select('profile_id')
      .eq('id', educatorId)
      .maybeSingle();

    if (!ep?.profile_id) {
      this.logger.warn(
        `Cannot notify educator ${educatorId} — no matching educator_profiles row`,
      );
      return;
    }

    await this.notificationsService.create({
      profile_id: ep.profile_id,
      notification_type: 'document_review',
      title,
      message,
    });
  }

  private documentTypeLabel(type: DocumentType): string {
    switch (type) {
      case 'background_check':
        return "attestation d'antécédents judiciaires";
      case 'birth_certificate':
        return 'certificat de naissance';
      case 'cpr_certification':
        return 'secourisme petite enfance';
      case 'work_authorization':
        return 'preuve de citoyenneté ou de permis de travail valide';
      case 'secondary_id':
        return "pièce d'identité secondaire";
      case 'diploma':
        return 'diplôme ou attestation de formation';
      default:
        return 'document';
    }
  }
}
