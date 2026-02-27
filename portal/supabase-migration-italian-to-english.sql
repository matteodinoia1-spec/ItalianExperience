-- ============================================================================
-- Italian Experience ATS – Rename Italian columns to English
-- ============================================================================
-- Run this in Supabase SQL Editor only if your tables currently use Italian
-- column names. Relationships (client_id, candidate_id, job_offer_id, etc.)
-- are unchanged. Adjust or skip blocks if a column already exists in English.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------
ALTER TABLE clients RENAME COLUMN nome TO name;
ALTER TABLE clients RENAME COLUMN citta TO city;
ALTER TABLE clients RENAME COLUMN stato TO state;
ALTER TABLE clients RENAME COLUMN nazione TO country;
ALTER TABLE clients RENAME COLUMN telefono TO phone;
ALTER TABLE clients RENAME COLUMN note TO notes;

-- ----------------------------------------------------------------------------
-- JOB_OFFERS (skip any line if that column is already in English)
-- ----------------------------------------------------------------------------
-- If your table has titolo_posizione instead of title:
ALTER TABLE job_offers RENAME COLUMN titolo_posizione TO title;
-- If your table has descrizione instead of description:
ALTER TABLE job_offers RENAME COLUMN descrizione TO description;
-- If your table has paga:
ALTER TABLE job_offers RENAME COLUMN paga TO salary;
-- If your table has tipo_contratto:
ALTER TABLE job_offers RENAME COLUMN tipo_contratto TO contract_type;
-- If your table has numero_posizioni:
ALTER TABLE job_offers RENAME COLUMN numero_posizioni TO positions;
-- If your table has stato_offerta instead of status:
ALTER TABLE job_offers RENAME COLUMN stato_offerta TO status;
-- If your table has citta (and not location), uncomment:
-- ALTER TABLE job_offers RENAME COLUMN citta TO city;

-- ----------------------------------------------------------------------------
-- CANDIDATES (only if your table still has Italian column names)
-- ----------------------------------------------------------------------------
-- If your table has nome instead of first_name:
-- ALTER TABLE candidates RENAME COLUMN nome TO first_name;
-- If your table has cognome instead of last_name:
-- ALTER TABLE candidates RENAME COLUMN cognome TO last_name;
-- If your table has indirizzo instead of address:
-- ALTER TABLE candidates RENAME COLUMN indirizzo TO address;
-- If your table has posizione instead of position:
-- ALTER TABLE candidates RENAME COLUMN posizione TO position;
-- If your table has fonte instead of source:
-- ALTER TABLE candidates RENAME COLUMN fonte TO source;
-- If your table has note instead of notes:
-- ALTER TABLE candidates RENAME COLUMN note TO notes;

-- ----------------------------------------------------------------------------
-- PROFILES (usually already first_name, last_name)
-- ----------------------------------------------------------------------------
-- If your table has nome/cognome, uncomment:
-- ALTER TABLE profiles RENAME COLUMN nome TO first_name;
-- ALTER TABLE profiles RENAME COLUMN cognome TO last_name;
