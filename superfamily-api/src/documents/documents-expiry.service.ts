import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DocumentsService,
  type DocumentRow,
  type DocumentType,
} from './documents.service';

/**
 * Daily cron that walks `educator_documents` looking for rows that are
 * about to expire (within 30 days) or have already expired since the
 * last run.
 *
 *  30 days out → notify the educator, leave status = 'approved'.
 *   0 days out → flip to status = 'expired' + notify the educator.
 *
 * Co-located with the rest of the documents module rather than bolted
 * onto the shared `TasksService` so the expiry logic stays inside the
 * feature that owns it. `ScheduleModule.forRoot()` is already registered
 * globally by `TasksModule`, so we don't import it again here.
 */
@Injectable()
export class DocumentsExpiryService {
  private readonly logger = new Logger(DocumentsExpiryService.name);

  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Runs once per day at midnight America/Toronto (matches the other
   * educator-facing crons in TasksService). One pass handles both the
   * "expiring soon" warnings and the "has expired" status flip, so an
   * educator never gets a warning for a document that was already marked
   * expired on the same tick.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/Toronto',
    name: 'educator-documents-expiry-sweep',
  })
  async handleExpirySweep(): Promise<void> {
    this.logger.log('Starting educator document expiry sweep');

    // ── 1. Newly-expired rows: flip status and notify ─────────────────
    //
    // Done first so we don't also send a "30 days left" warning for a
    // row whose expires_at has crept past now() since the last sweep.
    const expired = await this.documentsService.findNewlyExpired();
    if (expired.length > 0) {
      await this.documentsService.markExpired(expired.map((r) => r.id));
      for (const row of expired) {
        await this.documentsService.notifyEducatorForDocument(
          row,
          'Document expiré',
          `Votre ${this.label(row.document_type)} a expiré. Veuillez téléverser une nouvelle version pour continuer à accepter des réservations.`,
        );
      }
      this.logger.log(`Marked ${expired.length} document(s) as expired`);
    }

    // ── 2. Expiring-soon warnings ─────────────────────────────────────
    //
    // These rows are still valid but their expires_at falls inside the
    // 30-day window. We send one warning per sweep — the next day's run
    // will send another until the row either expires or gets replaced.
    // That's loud but simple; if you want dedup (e.g., only warn on
    // day-30 / day-14 / day-7 / day-1), filter by day-difference in the
    // loop below.
    const expiringSoon = await this.documentsService.findExpiringSoon();
    for (const row of expiringSoon) {
      const when = row.expires_at
        ? new Date(row.expires_at).toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';
      await this.documentsService.notifyEducatorForDocument(
        row,
        'Document bientôt expiré',
        `Votre ${this.label(row.document_type)} expire le ${when}. Veuillez téléverser une nouvelle version.`,
      );
    }
    if (expiringSoon.length > 0) {
      this.logger.log(
        `Sent expiring-soon warnings for ${expiringSoon.length} document(s)`,
      );
    }

    this.logger.log('Educator document expiry sweep complete');
  }

  private label(type: DocumentType): string {
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
