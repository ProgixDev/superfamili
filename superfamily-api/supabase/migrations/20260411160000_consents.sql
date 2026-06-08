-- =============================================================================
-- Consent + policy versioning (Loi 25 compliance)
-- =============================================================================
-- Two tables:
--
--   * `policy_versions`  — every published version of every policy, with the
--                          full Markdown content. One row per (consent_type,
--                          version). Historical versions are preserved so
--                          users can always see what they actually agreed to.
--
--   * `user_consents`    — one row per (user, consent_type, version) recording
--                          the user's decision. `accepted=true` + `revoked_at
--                          IS NULL` is the "effective" state. Revoking a
--                          consent flips `revoked_at`/`revoked_ip` etc.
--                          instead of deleting the row, preserving the audit
--                          trail.
--
-- The spec said `unique(user_id, consent_type, version)` — we keep that, and
-- use `revoked_at` for the withdrawal case (otherwise a revoke followed by a
-- re-accept of the same version would conflict with the unique constraint).
-- =============================================================================

BEGIN;

-- 1. Enum ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_type') THEN
    CREATE TYPE consent_type AS ENUM (
      'terms_of_use',
      'privacy_policy',
      'kyc_verification',
      'reference_contact',
      'background_check_storage',
      'marketing_emails'
    );
  END IF;
END$$;

-- 2. policy_versions -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_type   consent_type NOT NULL,
  version        text NOT NULL,
  effective_date date NOT NULL,
  content_md     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consent_type, version)
);

COMMENT ON TABLE public.policy_versions IS
  'Published policy versions. One row per (consent_type, version). New versions force re-consent from all users who accepted a previous version.';

CREATE INDEX IF NOT EXISTS idx_policy_versions_type_date
  ON public.policy_versions(consent_type, effective_date DESC);

-- 3. user_consents -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type        consent_type NOT NULL,
  version             text NOT NULL,
  accepted            boolean NOT NULL,
  accepted_at         timestamptz NOT NULL DEFAULT now(),
  ip_address          inet,
  user_agent          text,
  -- Revocation columns — the spec's unique(user_id, consent_type, version)
  -- means we can't insert a second row for the same decision. Instead, a
  -- revocation flips these in place. `revoked_at IS NULL` means the consent
  -- is currently effective (assuming `accepted = true`).
  revoked_at          timestamptz,
  revoked_ip          inet,
  revoked_user_agent  text,
  UNIQUE (user_id, consent_type, version)
);

COMMENT ON COLUMN public.user_consents.revoked_at IS
  'When set, the user withdrew this consent. Effective state = accepted=true AND revoked_at IS NULL.';

CREATE INDEX IF NOT EXISTS idx_user_consents_user
  ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type
  ON public.user_consents(user_id, consent_type);

-- 4. Seed: initial 2026-04-11 policy versions ---------------------------------
--
-- Every consent type gets exactly one version to start. The two big policies
-- (terms + privacy) ship with structured French content covering the Loi 25
-- requirements. The four per-feature consents (KYC, background check,
-- reference contact, marketing) get shorter modal-appropriate content.
--
-- Dollar-quoting ($POLICY$...$POLICY$) keeps the Markdown readable without
-- escaping apostrophes.

INSERT INTO public.policy_versions (consent_type, version, effective_date, content_md)
VALUES
  ('terms_of_use', '2026-04-11', '2026-04-11', $POLICY$
# Conditions d'utilisation

*Dernière mise à jour : 11 avril 2026*

## 1. Introduction

Ces conditions régissent l'utilisation de la plateforme SuperFamili, exploitée par SuperFamili inc. (« nous », « notre »). En créant un compte, vous acceptez ces conditions dans leur intégralité. Si vous n'êtes pas d'accord, vous ne devez pas utiliser la plateforme.

## 2. Services offerts

SuperFamili met en relation des familles et des éducateurs qualifiés pour de la garde d'enfants au Québec. Nous fournissons :

- La recherche d'éducateurs par localisation, tarif et disponibilité
- La messagerie sécurisée entre parents et éducateurs
- Le traitement des paiements via Stripe
- Un processus de vérification d'identité et d'antécédents
- Un service client pour résoudre les différends

## 3. Responsabilités des utilisateurs

### Parents
- Fournir des informations exactes sur leurs enfants
- Payer les services réservés dans les délais convenus
- Traiter les éducateurs avec respect

### Éducateurs
- Fournir une identité vérifiable et à jour
- Respecter les limites légales d'enfants par éducateur (Loi du Québec)
- Maintenir leurs certifications (RCR, etc.) à jour

## 4. Paiements et commissions

Les paiements sont traités par Stripe. SuperFamili prélève une commission sur chaque réservation complétée. Les éducateurs reçoivent leurs versements selon les modalités affichées dans leur tableau de bord.

## 5. Annulations et remboursements

- Annulation > 24 h avant la réservation : remboursement complet
- Annulation < 24 h : frais d'annulation de 25 %
- Non-présentation : aucun remboursement, sauf circonstances exceptionnelles

## 6. Loi 25 et protection des renseignements personnels

SuperFamili respecte la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (Loi 25). Pour tout renseignement ou plainte concernant la protection de vos renseignements personnels, vous pouvez contacter la Commission d'accès à l'information du Québec (CAI).

## 7. Vos droits

Conformément à la Loi 25, vous avez le droit :
- D'accéder à vos renseignements personnels
- De les faire corriger
- De les faire supprimer
- De les recevoir dans un format portable
- De retirer votre consentement à tout moment

## 8. Contact

Pour toute question concernant ces conditions :
- Courriel : support@superfamili.ca
- Adresse : [À compléter]
$POLICY$),

  ('privacy_policy', '2026-04-11', '2026-04-11', $POLICY$
# Politique de confidentialité

*Dernière mise à jour : 11 avril 2026*

## 1. Introduction

Cette politique explique comment SuperFamili inc. recueille, utilise et protège vos renseignements personnels, conformément à la Loi 25 du Québec.

## 2. Renseignements que nous recueillons

- **Informations de compte** : nom, courriel, téléphone, code postal
- **Informations de vérification** (éducateurs) : pièce d'identité, selfie, antécédents judiciaires, certifications
- **Informations de paiement** : traitées par Stripe — nous ne stockons jamais vos numéros de carte
- **Données d'utilisation** : historique de réservations, messages, évaluations
- **Renseignements techniques** : adresse IP, type de navigateur, appareil

## 3. Utilisation des renseignements

Nous utilisons vos renseignements pour :
- Fournir et améliorer les services de la plateforme
- Vérifier votre identité et vos antécédents (éducateurs)
- Traiter les paiements et les versements
- Communiquer avec vous au sujet de votre compte
- Respecter nos obligations légales

## 4. Services tiers

SuperFamili partage certaines données avec ces fournisseurs :
- **Didit** (https://didit.me) — vérification d'identité automatisée
- **Stripe** (https://stripe.com) — traitement des paiements
- **Supabase** (https://supabase.com) — hébergement des données

Ces fournisseurs sont soumis à leurs propres politiques de confidentialité. Nous ne partageons que le minimum nécessaire pour fournir le service.

## 5. Conservation des données

- Données de compte : tant que votre compte est actif
- Documents de vérification : supprimés 90 jours après la fermeture du compte
- Historique de réservations : conservé 7 ans pour des raisons comptables
- Messages : supprimés 1 an après la dernière interaction

## 6. Loi 25 — vos droits

Conformément à la Loi sur la protection des renseignements personnels dans le secteur privé :

- **Droit d'accès** : consulter les renseignements que nous détenons sur vous
- **Droit de rectification** : corriger des renseignements inexacts
- **Droit à l'oubli** : demander la suppression de vos renseignements
- **Droit à la portabilité** : recevoir vos renseignements dans un format structuré
- **Droit de retirer votre consentement** : à tout moment, sans justification

Pour exercer ces droits, contactez notre responsable de la protection des renseignements personnels à privacy@superfamili.ca.

Vous pouvez également déposer une plainte auprès de la Commission d'accès à l'information du Québec (CAI) :
- Site : https://www.cai.gouv.qc.ca
- Téléphone : 1 888 528-7741

## 7. Sécurité

Nous utilisons des mesures de sécurité reconnues (chiffrement TLS, accès restreint, surveillance) pour protéger vos renseignements. Aucune transmission Internet n'est totalement sécurisée, mais nous faisons tout notre possible pour minimiser les risques.

## 8. Contact

Responsable de la protection des renseignements personnels :
- Courriel : privacy@superfamili.ca
- Adresse : [À compléter]
$POLICY$),

  ('kyc_verification', '2026-04-11', '2026-04-11', $POLICY$
# Consentement à la vérification d'identité (KYC)

*Dernière mise à jour : 11 avril 2026*

Pour assurer la sécurité des familles que vous aiderez, SuperFamili doit vérifier votre identité avant que votre compte d'éducateur ne soit activé.

## Comment ça fonctionne

La vérification est effectuée par **Didit** (https://didit.me), un service tiers spécialisé en vérification d'identité. Le processus inclut :

- **Photo de votre pièce d'identité** — permis de conduire, carte d'assurance maladie, passeport ou autre pièce gouvernementale valide
- **Selfie (liveness)** — pour confirmer que vous êtes une personne réelle, pas une photo ou une vidéo
- **Comparaison visage** — entre votre selfie et la photo de votre pièce d'identité
- **Analyse de connexion** — pour détecter les tentatives de fraude (VPN, IP suspecte)

## Vos données

- Les images et les résultats de vérification sont stockés de façon sécurisée chez Didit et chez SuperFamili
- Ces données ne sont partagées avec personne d'autre sans votre consentement explicite
- Vous pouvez demander la suppression de ces données à tout moment en nous contactant à privacy@superfamili.ca
- Les données de vérification sont automatiquement supprimées 90 jours après la fermeture de votre compte

## Ce que cela implique

En acceptant, vous autorisez SuperFamili et Didit à :

1. Collecter, traiter et stocker les images et les données de vérification mentionnées ci-dessus
2. Partager ces données avec notre équipe administrative pour examen manuel si nécessaire
3. Conserver le score de vérification sur votre profil jusqu'à la fermeture du compte

Vous pouvez retirer ce consentement à tout moment. Dans ce cas, votre compte d'éducateur sera désactivé jusqu'à nouvelle vérification.
$POLICY$),

  ('background_check_storage', '2026-04-11', '2026-04-11', $POLICY$
# Consentement au stockage des antécédents judiciaires

*Dernière mise à jour : 11 avril 2026*

Vous êtes sur le point de téléverser votre **attestation d'antécédents judiciaires** (obtenue auprès de votre poste de police local). Ce document est confidentiel et sensible.

## Ce que nous faisons avec ce document

- **Stockage chiffré** dans un espace de stockage privé auquel seule notre équipe administrative a accès
- **Examen manuel** par un administrateur pour vérifier la validité et la date d'émission (doit dater de moins de 6 mois)
- **Conservation** jusqu'à la fermeture de votre compte ou à votre demande de suppression

## Qui peut y accéder

- **Notre équipe administrative** — uniquement pour vérification
- **Vous** — via votre tableau de bord
- **Personne d'autre**, y compris d'autres utilisateurs ou éducateurs

Le document n'est **jamais** partagé avec des tiers sauf obligation légale.

## Vos droits

- Vous pouvez demander la suppression de ce document à tout moment. Dans ce cas, votre compte d'éducateur sera désactivé jusqu'à nouveau téléversement.
- Vous pouvez consulter le document depuis votre tableau de bord à tout moment.
- Ce document sera automatiquement supprimé 90 jours après la fermeture de votre compte.

En acceptant, vous autorisez SuperFamili à stocker et à consulter ce document pour les fins décrites ci-dessus.
$POLICY$),

  ('reference_contact', '2026-04-11', '2026-04-11', $POLICY$
# Consentement à la vérification des références

*Dernière mise à jour : 11 avril 2026*

Dans le cadre de votre processus de vérification, notre équipe administrative contactera les personnes que vous fournissez comme références (par téléphone ou par courriel) pour confirmer :

- Qu'elles vous connaissent réellement
- La nature et la durée de votre relation
- Leur témoignage concernant votre fiabilité et votre caractère

## Ce que nous demandons

- Nom complet de chaque référence
- Numéro de téléphone (format canadien)
- Adresse courriel (optionnel)
- Adresse postale
- Témoignage écrit de 50 à 1000 caractères

## Ce que nous ne faisons pas

- Nous ne partageons **aucune** information personnelle vous concernant avec vos références au-delà de votre nom
- Nous ne partageons pas les témoignages avec d'autres utilisateurs
- Nous ne conservons pas les informations de contact de vos références après la fermeture de votre compte

En acceptant, vous :

1. Confirmez avoir obtenu l'accord des personnes que vous listez pour être contactées par SuperFamili
2. Autorisez SuperFamili à contacter ces personnes par téléphone ou par courriel
3. Comprenez que les résultats de ces vérifications peuvent influencer l'acceptation de votre profil éducateur

Vous pouvez retirer ce consentement à tout moment, auquel cas les références non encore vérifiées seront supprimées.
$POLICY$),

  ('marketing_emails', '2026-04-11', '2026-04-11', $POLICY$
# Consentement aux communications marketing

*Dernière mise à jour : 11 avril 2026*

En acceptant, vous autorisez SuperFamili à vous envoyer occasionnellement :

- Des nouveautés sur la plateforme
- Des conseils pour les parents et éducateurs
- Des offres promotionnelles et des événements
- Des enquêtes de satisfaction

## Fréquence

Nous limitons les communications marketing à **un maximum de 2 envois par mois**. Les courriels transactionnels (confirmations de réservation, rappels, notifications) ne sont pas concernés par ce consentement — ils sont nécessaires au fonctionnement du service.

## Comment se désabonner

- Cliquez sur le lien « Se désabonner » au bas de n'importe quel courriel marketing
- Ou retirez votre consentement depuis la page **Paramètres → Consentements** de votre compte

Ce consentement est **optionnel** — votre compte fonctionne parfaitement sans.
$POLICY$)
ON CONFLICT (consent_type, version) DO NOTHING;

COMMIT;

-- =============================================================================
-- Rollback:
--
-- BEGIN;
--   DROP INDEX IF EXISTS public.idx_user_consents_user_type;
--   DROP INDEX IF EXISTS public.idx_user_consents_user;
--   DROP TABLE IF EXISTS public.user_consents;
--   DROP INDEX IF EXISTS public.idx_policy_versions_type_date;
--   DROP TABLE IF EXISTS public.policy_versions;
--   DROP TYPE IF EXISTS consent_type;
-- COMMIT;
-- =============================================================================
