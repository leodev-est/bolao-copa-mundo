-- Expande os plantéis do cartola_players para ~15-20 jogadores por time
-- Apenas adiciona jogadores que ainda não existem (sem apagar os atuais)

INSERT INTO cartola_players (name, position, team_name, price, avg_points, available) VALUES

-- ── South Korea (era 6, vai pra 18) ──────────────────────────────────────────
('Jo Hyeon-woo',       'GK',  'South Korea', 6.5,  0, true),
('Song Bum-keun',      'GK',  'South Korea', 5.5,  0, true),
('Kim Jin-su',         'DEF', 'South Korea', 7.5,  0, true),
('Kim Tae-hwan',       'DEF', 'South Korea', 7.0,  0, true),
('Seol Young-woo',     'DEF', 'South Korea', 6.5,  0, true),
('Lee Ki-je',          'DEF', 'South Korea', 6.0,  0, true),
('Hong Hyun-seok',     'DEF', 'South Korea', 6.0,  0, true),
('Hwang In-beom',      'MID', 'South Korea', 8.0,  0, true),
('Paik Seung-ho',      'MID', 'South Korea', 7.5,  0, true),
('Son Jun-ho',         'MID', 'South Korea', 7.0,  0, true),
('Kwon Chang-hoon',    'MID', 'South Korea', 7.0,  0, true),
('Oh Hyeon-gyu',       'FWD', 'South Korea', 7.5,  0, true),
('Cho Gue-sung',       'FWD', 'South Korea', 8.0,  0, true),

-- ── Ghana (era 5, vai pra 16) ────────────────────────────────────────────────
('Ibrahim Danlad',     'GK',  'Ghana', 5.0, 0, true),
('Daniel Amartey',     'DEF', 'Ghana', 6.5, 0, true),
('Tariq Lamptey',      'DEF', 'Ghana', 7.0, 0, true),
('Abdul Rahman Baba',  'DEF', 'Ghana', 6.5, 0, true),
('Denis Odoi',         'DEF', 'Ghana', 6.0, 0, true),
('Salis Abdul Samed',  'MID', 'Ghana', 7.5, 0, true),
('Ernest Nuamah',      'FWD', 'Ghana', 7.5, 0, true),
('Inaki Williams',     'FWD', 'Ghana', 8.5, 0, true),
('Antoine Semenyo',    'FWD', 'Ghana', 7.5, 0, true),
('Felix Afena-Gyan',   'FWD', 'Ghana', 6.5, 0, true),
('Joseph Paintsil',    'FWD', 'Ghana', 7.0, 0, true),

-- ── Tunisia (era 4, vai pra 15) ──────────────────────────────────────────────
('Moez Ben Cherifia',  'GK',  'Tunisia', 5.5, 0, true),
('Dylan Bronn',        'DEF', 'Tunisia', 6.5, 0, true),
('Ali Maaloul',        'DEF', 'Tunisia', 6.5, 0, true),
('Montassar Talbi',    'DEF', 'Tunisia', 6.0, 0, true),
('Mohamed Drager',     'DEF', 'Tunisia', 6.0, 0, true),
('Anis Ben Slimane',   'MID', 'Tunisia', 7.0, 0, true),
('Hannibal Mejbri',    'MID', 'Tunisia', 7.5, 0, true),
('Naim Sliti',         'MID', 'Tunisia', 6.5, 0, true),
('Youssef Msakni',     'FWD', 'Tunisia', 7.0, 0, true),
('Taha Yassine Khenissi', 'FWD', 'Tunisia', 6.0, 0, true),
('Sayfallah Ltaief',   'FWD', 'Tunisia', 6.0, 0, true),

-- ── Cameroon (era 5, vai pra 16) ─────────────────────────────────────────────
('Devis Epassy',       'GK',  'Cameroon', 6.0, 0, true),
('Jean-Charles Castelletto', 'DEF', 'Cameroon', 6.5, 0, true),
('Collins Fai',        'DEF', 'Cameroon', 6.0, 0, true),
('Nouhou Tolo',        'DEF', 'Cameroon', 6.0, 0, true),
('Michael Ngadeu-Ngadjui', 'DEF', 'Cameroon', 6.5, 0, true),
('Samuel Oum Gouet',   'MID', 'Cameroon', 6.5, 0, true),
('Martin Hongla',      'MID', 'Cameroon', 6.0, 0, true),
('Olivier Ntcham',     'MID', 'Cameroon', 6.5, 0, true),
('Bryan Mbeumo',       'FWD', 'Cameroon', 8.5, 0, true),
('Ignatius Ganago',    'FWD', 'Cameroon', 6.5, 0, true),
('Christian Bassogog', 'FWD', 'Cameroon', 6.5, 0, true),

-- ── Australia (era 6, vai pra 17) ────────────────────────────────────────────
('Danny Vukovic',      'GK',  'Australia', 5.5, 0, true),
('Thomas Deng',        'DEF', 'Australia', 5.5, 0, true),
('Aziz Behich',        'DEF', 'Australia', 5.5, 0, true),
('Harry Souttar',      'DEF', 'Australia', 7.0, 0, true),
('Nathaniel Atkinson', 'DEF', 'Australia', 5.5, 0, true),
('Jackson Irvine',     'MID', 'Australia', 6.5, 0, true),
('Riley McGree',       'MID', 'Australia', 6.5, 0, true),
('Cameron Devlin',     'MID', 'Australia', 6.0, 0, true),
('Keanu Baccus',       'MID', 'Australia', 6.0, 0, true),
('Martin Boyle',       'FWD', 'Australia', 6.5, 0, true),
('Craig Goodwin',      'FWD', 'Australia', 6.0, 0, true),

-- ── Japan (era 8, vai pra 18) ────────────────────────────────────────────────
('Zion Suzuki',        'GK',  'Japan', 7.0, 0, true),
('Miki Yamane',        'DEF', 'Japan', 6.5, 0, true),
('Shogo Taniguchi',    'DEF', 'Japan', 6.5, 0, true),
('Takehiro Tomiyasu',  'DEF', 'Japan', 7.5, 0, true),
('Yuto Nagatomo',      'DEF', 'Japan', 7.0, 0, true),
('Junya Ito',          'FWD', 'Japan', 8.0, 0, true),
('Ayase Ueda',         'FWD', 'Japan', 7.5, 0, true),
('Takumi Minamino',    'MID', 'Japan', 7.5, 0, true),
('Ao Tanaka',          'MID', 'Japan', 7.0, 0, true),
('Hidemasa Morita',    'MID', 'Japan', 7.0, 0, true),

-- ── Switzerland (era 6, vai pra 16) ──────────────────────────────────────────
('Gregor Kobel',       'GK',  'Switzerland', 7.0, 0, true),
('Kevin Mbabu',        'DEF', 'Switzerland', 6.5, 0, true),
('Nico Elvedi',        'DEF', 'Switzerland', 7.0, 0, true),
('Silvan Widmer',      'DEF', 'Switzerland', 6.5, 0, true),
('Fabian Schär',       'DEF', 'Switzerland', 7.5, 0, true),
('Denis Zakaria',      'MID', 'Switzerland', 7.5, 0, true),
('Michel Aebischer',   'MID', 'Switzerland', 6.5, 0, true),
('Dan Ndoye',          'FWD', 'Switzerland', 7.5, 0, true),
('Ruben Vargas',       'FWD', 'Switzerland', 7.0, 0, true),
('Zeki Amdouni',       'FWD', 'Switzerland', 7.5, 0, true),

-- ── Croatia (era 6, vai pra 17) ──────────────────────────────────────────────
('Ivica Ivušić',       'GK',  'Croatia', 7.0,  0, true),
('Josip Juranović',    'DEF', 'Croatia', 7.0,  0, true),
('Duje Ćaleta-Car',    'DEF', 'Croatia', 7.5,  0, true),
('Borna Sosa',         'DEF', 'Croatia', 7.0,  0, true),
('Martin Erlic',       'DEF', 'Croatia', 6.5,  0, true),
('Mario Pašalić',      'MID', 'Croatia', 9.0,  0, true),
('Lovro Majer',        'MID', 'Croatia', 8.5,  0, true),
('Marcelo Brozović',   'MID', 'Croatia', 10.0, 0, true),
('Nikola Vlašić',      'MID', 'Croatia', 8.5,  0, true),
('Marko Livaja',       'FWD', 'Croatia', 8.0,  0, true),
('Bruno Petković',     'FWD', 'Croatia', 7.5,  0, true),

-- ── Mexico (era 12, adiciona mais 6) ─────────────────────────────────────────
('Guillermo Ochoa',    'GK',  'Mexico', 8.0, 0, true),  -- possível duplicata, sem problema
('Santiago Giménez',   'FWD', 'Mexico', 10.0, 0, true),
('Roberto Alvarado',   'MID', 'Mexico', 8.0,  0, true),
('Carlos Antuna',      'FWD', 'Mexico', 7.5,  0, true),
('Uriel Antuna',       'MID', 'Mexico', 7.0,  0, true),
('Jorge Sánchez',      'DEF', 'Mexico', 7.0,  0, true),

-- ── South Africa (era 10, adiciona mais 6) ───────────────────────────────────
('Khuliso Mudau',      'DEF', 'South Africa', 5.0, 0, true),
('Terrence Mashego',   'DEF', 'South Africa', 5.0, 0, true),
('Mothobi Mvala',      'MID', 'South Africa', 5.5, 0, true),
('Elias Mokwana',      'FWD', 'South Africa', 5.5, 0, true),
('Lyle Foster',        'FWD', 'South Africa', 7.0, 0, true),
('Evidence Makgopa',   'FWD', 'South Africa', 6.5, 0, true),

-- ── Ecuador (era 7, adiciona mais 5) ─────────────────────────────────────────
('Alexander Domínguez','GK',  'Ecuador', 7.0, 0, true),
('Félix Torres',       'DEF', 'Ecuador', 7.5, 0, true),
('Diego Palacios',     'DEF', 'Ecuador', 6.5, 0, true),
('Jeremy Sarmiento',   'FWD', 'Ecuador', 7.5, 0, true),
('Kevin Rodríguez',    'MID', 'Ecuador', 7.0, 0, true),

-- ── Senegal (era 7, adiciona mais 6) ─────────────────────────────────────────
('Seny Dieng',         'GK',  'Senegal', 6.5, 0, true),
('Formose Mendy',      'DEF', 'Senegal', 6.0, 0, true),
('Abdou Diallo',       'DEF', 'Senegal', 7.0, 0, true),
('Nicolas Jackson',    'FWD', 'Senegal', 9.0, 0, true),
('Pape Matar Sarr',    'MID', 'Senegal', 8.0, 0, true),
('Lamine Camara',      'MID', 'Senegal', 7.5, 0, true),

-- ── United States (era 9, adiciona mais 6) ───────────────────────────────────
('Ethan Horvath',      'GK',  'United States', 6.5, 0, true),
('Antonee Robinson',   'DEF', 'United States', 7.5, 0, true),
('Tim Weah',           'FWD', 'United States', 8.0, 0, true),
('Ricardo Pepi',       'FWD', 'United States', 8.5, 0, true),
('Folarin Balogun',    'FWD', 'United States', 8.5, 0, true),
('Malik Tillman',      'MID', 'United States', 7.5, 0, true),

-- ── Canada (era 8, adiciona mais 6) ──────────────────────────────────────────
('Milan Borjan',       'GK',  'Canada', 7.0, 0, true),
('Sam Adekugbe',       'DEF', 'Canada', 6.5, 0, true),
('Alistair Johnston',  'DEF', 'Canada', 7.0, 0, true),
('Derek Cornelius',    'DEF', 'Canada', 6.5, 0, true),
('Liam Millar',        'FWD', 'Canada', 7.0, 0, true),
('Richie Laryea',      'DEF', 'Canada', 6.5, 0, true)

ON CONFLICT DO NOTHING;
