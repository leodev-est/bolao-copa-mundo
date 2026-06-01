-- ============================================================
-- Jogadores Argentina x Iceland — para testar os slots de artilheiro
-- Execute no SQL Editor do Supabase
-- ============================================================

DO $$
DECLARE
  v_match_id UUID;
BEGIN

SELECT id INTO v_match_id
FROM public.matches
WHERE home_team ILIKE '%Argentina%' AND away_team ILIKE '%Iceland%'
LIMIT 1;

IF v_match_id IS NULL THEN
  RAISE EXCEPTION 'Partida Argentina x Iceland não encontrada no banco.';
END IF;

-- Remove goalscorer options anteriores para esse jogo (se houver)
DELETE FROM public.bet_options
WHERE match_id = v_match_id AND type = 'goalscorer';

-- ── ARGENTINA ────────────────────────────────────────────────
INSERT INTO public.bet_options (match_id, type, description, odd, metadata) VALUES
-- Titulares
(v_match_id,'goalscorer','Lionel Messi marca gol',         2.20,'{"player_id":154,"player_name":"Lionel Messi",       "team":"Argentina","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Julián Álvarez marca gol',       2.80,'{"player_id":723,"player_name":"Julián Álvarez",     "team":"Argentina","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Ángel Di María marca gol',       3.40,'{"player_id":498,"player_name":"Ángel Di María",     "team":"Argentina","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Rodrigo De Paul marca gol',      4.50,'{"player_id":769,"player_name":"Rodrigo De Paul",    "team":"Argentina","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Enzo Fernández marca gol',       5.00,'{"player_id":812,"player_name":"Enzo Fernández",     "team":"Argentina","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Alexis Mac Allister marca gol',  4.80,'{"player_id":876,"player_name":"Alexis Mac Allister","team":"Argentina","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Nahuel Molina marca gol',        7.00,'{"player_id":345,"player_name":"Nahuel Molina",      "team":"Argentina","pos":"D","starter":true}'),
(v_match_id,'goalscorer','Nicolás Tagliafico marca gol',   8.00,'{"player_id":412,"player_name":"Nicolás Tagliafico", "team":"Argentina","pos":"D","starter":true}'),
(v_match_id,'goalscorer','Cristian Romero marca gol',      9.00,'{"player_id":567,"player_name":"Cristian Romero",    "team":"Argentina","pos":"D","starter":true}'),
(v_match_id,'goalscorer','Lisandro Martínez marca gol',    9.00,'{"player_id":623,"player_name":"Lisandro Martínez",  "team":"Argentina","pos":"D","starter":true}'),
-- Reservas
(v_match_id,'goalscorer','Lautaro Martínez marca gol',     3.00,'{"player_id":701,"player_name":"Lautaro Martínez",   "team":"Argentina","pos":"F","starter":false}'),
(v_match_id,'goalscorer','Paulo Dybala marca gol',         3.50,'{"player_id":288,"player_name":"Paulo Dybala",       "team":"Argentina","pos":"F","starter":false}'),
(v_match_id,'goalscorer','Nicolás González marca gol',     5.50,'{"player_id":834,"player_name":"Nicolás González",   "team":"Argentina","pos":"F","starter":false}'),
(v_match_id,'goalscorer','Leandro Paredes marca gol',      7.50,'{"player_id":390,"player_name":"Leandro Paredes",    "team":"Argentina","pos":"M","starter":false}'),
(v_match_id,'goalscorer','Thiago Almada marca gol',        6.00,'{"player_id":901,"player_name":"Thiago Almada",      "team":"Argentina","pos":"M","starter":false}'),
(v_match_id,'goalscorer','Guido Rodríguez marca gol',      8.00,'{"player_id":456,"player_name":"Guido Rodríguez",    "team":"Argentina","pos":"M","starter":false}'),
(v_match_id,'goalscorer','Marcos Acuña marca gol',         8.50,'{"player_id":478,"player_name":"Marcos Acuña",       "team":"Argentina","pos":"D","starter":false}'),
(v_match_id,'goalscorer','Germán Pezzella marca gol',      9.00,'{"player_id":389,"player_name":"Germán Pezzella",    "team":"Argentina","pos":"D","starter":false}');

-- ── ICELAND ──────────────────────────────────────────────────
INSERT INTO public.bet_options (match_id, type, description, odd, metadata) VALUES
-- Titulares
(v_match_id,'goalscorer','Albert Guðmundsson marca gol',   3.20,'{"player_id":201,"player_name":"Albert Guðmundsson",  "team":"Iceland","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Aron Sigurðarson marca gol',     5.00,'{"player_id":202,"player_name":"Aron Sigurðarson",    "team":"Iceland","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Jón Daði Böðvarsson marca gol',  5.50,'{"player_id":203,"player_name":"Jón Daði Böðvarsson", "team":"Iceland","pos":"F","starter":true}'),
(v_match_id,'goalscorer','Willum Willumsson marca gol',    6.00,'{"player_id":204,"player_name":"Willum Willumsson",   "team":"Iceland","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Birkir Bjarnason marca gol',     6.50,'{"player_id":205,"player_name":"Birkir Bjarnason",    "team":"Iceland","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Gylfi Sigurðsson marca gol',     5.00,'{"player_id":206,"player_name":"Gylfi Sigurðsson",    "team":"Iceland","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Jóhann Gudmundsson marca gol',   7.00,'{"player_id":207,"player_name":"Jóhann Gudmundsson",  "team":"Iceland","pos":"M","starter":true}'),
(v_match_id,'goalscorer','Hólmar Eyjólfsson marca gol',    9.00,'{"player_id":208,"player_name":"Hólmar Eyjólfsson",   "team":"Iceland","pos":"D","starter":true}'),
(v_match_id,'goalscorer','Kári Árnason marca gol',         9.00,'{"player_id":209,"player_name":"Kári Árnason",        "team":"Iceland","pos":"D","starter":true}'),
(v_match_id,'goalscorer','Sverrir Ingi Ingason marca gol', 9.00,'{"player_id":210,"player_name":"Sverrir Ingi Ingason","team":"Iceland","pos":"D","starter":true}'),
-- Reservas
(v_match_id,'goalscorer','Eidur Smári Guðjohnsen marca gol',5.00,'{"player_id":211,"player_name":"Eidur Smári Guðjohnsen","team":"Iceland","pos":"F","starter":false}'),
(v_match_id,'goalscorer','Aron Gunnarsson marca gol',      7.50,'{"player_id":212,"player_name":"Aron Gunnarsson",     "team":"Iceland","pos":"M","starter":false}'),
(v_match_id,'goalscorer','Emil Hallfreðsson marca gol',    8.00,'{"player_id":213,"player_name":"Emil Hallfreðsson",   "team":"Iceland","pos":"M","starter":false}'),
(v_match_id,'goalscorer','Ragnar Sigurðsson marca gol',    9.00,'{"player_id":214,"player_name":"Ragnar Sigurðsson",   "team":"Iceland","pos":"D","starter":false}'),
(v_match_id,'goalscorer','Ögmundur Kristinsson marca gol', 9.00,'{"player_id":215,"player_name":"Ögmundur Kristinsson","team":"Iceland","pos":"D","starter":false}');

RAISE NOTICE 'Jogadores inseridos para Argentina x Iceland. Match ID: %', v_match_id;

END $$;
