-- Passo 1: Renomeia times do seed (português → inglês) para bater com a tabela matches
UPDATE cartola_players SET team_name = 'Brazil'      WHERE team_name = 'Brasil';
UPDATE cartola_players SET team_name = 'France'      WHERE team_name = 'França';
UPDATE cartola_players SET team_name = 'Spain'       WHERE team_name = 'Espanha';
UPDATE cartola_players SET team_name = 'England'     WHERE team_name = 'Inglaterra';
UPDATE cartola_players SET team_name = 'Germany'     WHERE team_name = 'Alemanha';
UPDATE cartola_players SET team_name = 'Netherlands' WHERE team_name = 'Holanda';
UPDATE cartola_players SET team_name = 'Uruguay'     WHERE team_name = 'Uruguai';
UPDATE cartola_players SET team_name = 'Colombia'    WHERE team_name = 'Colômbia';
UPDATE cartola_players SET team_name = 'Morocco'     WHERE team_name = 'Marrocos';

-- Passo 2: Apaga times que vão ser inseridos (para evitar duplicatas, caso rode 2x)
DELETE FROM cartola_players WHERE team_name IN (
  'Mexico','South Africa','United States','Canada','Japan',
  'Ecuador','Senegal','Australia','Switzerland','Croatia',
  'South Korea','Ghana','Tunisia','Cameroon'
);

-- Passo 3: Insere jogadores dos times que faltavam
INSERT INTO cartola_players (name, position, team_name, price, avg_points, available) VALUES

-- Mexico
('Guillermo Ochoa',   'GK',  'Mexico', 8.0,  0, true),
('Luis Malagón',      'GK',  'Mexico', 7.0,  0, true),
('Jesús Gallardo',    'DEF', 'Mexico', 7.0,  0, true),
('Jesús Corona',      'DEF', 'Mexico', 7.0,  0, true),
('Johan Vásquez',     'DEF', 'Mexico', 7.0,  0, true),
('César Montes',      'DEF', 'Mexico', 7.5,  0, true),
('Edson Álvarez',     'MID', 'Mexico', 9.0,  0, true),
('Andrés Guardado',   'MID', 'Mexico', 8.0,  0, true),
('Chucky Lozano',     'FWD', 'Mexico', 10.0, 0, true),
('Raúl Jiménez',      'FWD', 'Mexico', 10.0, 0, true),
('Henry Martín',      'FWD', 'Mexico', 8.0,  0, true),
('Alexis Vega',       'FWD', 'Mexico', 8.0,  0, true),

-- South Africa
('Ronwen Williams',    'GK',  'South Africa', 6.0, 0, true),
('Sifiso Hlanti',      'DEF', 'South Africa', 5.0, 0, true),
('Rushine De Reuck',   'DEF', 'South Africa', 5.0, 0, true),
('Nyiko Mobbie',       'DEF', 'South Africa', 5.0, 0, true),
('Teboho Mokoena',     'MID', 'South Africa', 6.0, 0, true),
('Bongani Zungu',      'MID', 'South Africa', 6.0, 0, true),
('Themba Zwane',       'MID', 'South Africa', 6.5, 0, true),
('Percy Tau',          'FWD', 'South Africa', 8.0, 0, true),
('Thembinkosi Lorch',  'FWD', 'South Africa', 6.0, 0, true),
('Lebo Mothiba',       'FWD', 'South Africa', 6.0, 0, true),

-- United States
('Matt Turner',        'GK',  'United States', 8.0,  0, true),
('Sergino Dest',       'DEF', 'United States', 7.5,  0, true),
('Miles Robinson',     'DEF', 'United States', 7.0,  0, true),
('Walker Zimmerman',   'DEF', 'United States', 7.0,  0, true),
('Weston McKennie',    'MID', 'United States', 8.5,  0, true),
('Tyler Adams',        'MID', 'United States', 8.0,  0, true),
('Yunus Musah',        'MID', 'United States', 8.0,  0, true),
('Christian Pulisic',  'FWD', 'United States', 10.0, 0, true),
('Gio Reyna',          'FWD', 'United States', 9.0,  0, true),
('Josh Sargent',       'FWD', 'United States', 8.0,  0, true),

-- Canada
('Maxime Crépeau',     'GK',  'Canada', 8.0,  0, true),
('Alphonso Davies',    'DEF', 'Canada', 10.0, 0, true),
('Steven Vitória',     'DEF', 'Canada', 7.0,  0, true),
('Jonathan David',     'FWD', 'Canada', 10.0, 0, true),
('Cyle Larin',         'FWD', 'Canada', 8.0,  0, true),
('Tajon Buchanan',     'FWD', 'Canada', 8.0,  0, true),
('Stephen Eustáquio',  'MID', 'Canada', 8.0,  0, true),
('Ismael Koné',        'MID', 'Canada', 7.5,  0, true),

-- Japan
('Shuichi Gonda',      'GK',  'Japan', 8.0,  0, true),
('Wataru Endo',        'MID', 'Japan', 8.0,  0, true),
('Takefusa Kubo',      'FWD', 'Japan', 9.0,  0, true),
('Ritsu Doan',         'FWD', 'Japan', 8.5,  0, true),
('Kaoru Mitoma',       'FWD', 'Japan', 8.5,  0, true),
('Daichi Kamada',      'MID', 'Japan', 8.0,  0, true),
('Maya Yoshida',       'DEF', 'Japan', 7.0,  0, true),
('Ko Itakura',         'DEF', 'Japan', 7.0,  0, true),

-- Ecuador
('Hernán Galíndez',    'GK',  'Ecuador', 8.0,  0, true),
('Byron Castillo',     'DEF', 'Ecuador', 7.0,  0, true),
('Piero Hincapié',     'DEF', 'Ecuador', 8.0,  0, true),
('Moisés Caicedo',     'MID', 'Ecuador', 9.0,  0, true),
('Kendry Páez',        'MID', 'Ecuador', 8.5,  0, true),
('Enner Valencia',     'FWD', 'Ecuador', 10.0, 0, true),
('Gonzalo Plata',      'FWD', 'Ecuador', 8.0,  0, true),

-- Senegal
('Édouard Mendy',      'GK',  'Senegal', 8.0,  0, true),
('Kalidou Koulibaly',  'DEF', 'Senegal', 8.5,  0, true),
('Idrissa Gueye',      'MID', 'Senegal', 7.5,  0, true),
('Pape Gueye',         'MID', 'Senegal', 7.0,  0, true),
('Sadio Mané',         'FWD', 'Senegal', 10.0, 0, true),
('Ismaila Sarr',       'FWD', 'Senegal', 8.5,  0, true),
('Boulaye Dia',        'FWD', 'Senegal', 8.0,  0, true),

-- Australia
('Mat Ryan',           'GK',  'Australia', 6.0, 0, true),
('Milos Degenek',      'DEF', 'Australia', 5.5, 0, true),
('Aaron Mooy',         'MID', 'Australia', 6.5, 0, true),
('Ajdin Hrustic',      'MID', 'Australia', 6.0, 0, true),
('Mathew Leckie',      'FWD', 'Australia', 7.0, 0, true),
('Mitchell Duke',      'FWD', 'Australia', 6.0, 0, true),

-- Switzerland
('Yann Sommer',        'GK',  'Switzerland', 8.0,  0, true),
('Manuel Akanji',      'DEF', 'Switzerland', 8.5,  0, true),
('Granit Xhaka',       'MID', 'Switzerland', 8.5,  0, true),
('Remo Freuler',       'MID', 'Switzerland', 7.5,  0, true),
('Xherdan Shaqiri',    'FWD', 'Switzerland', 8.0,  0, true),
('Breel Embolo',       'FWD', 'Switzerland', 8.0,  0, true),

-- Croatia
('Dominik Livaković',  'GK',  'Croatia', 8.0,  0, true),
('Joško Gvardiol',     'DEF', 'Croatia', 9.0,  0, true),
('Luka Modrić',        'MID', 'Croatia', 13.0, 0, true),
('Mateo Kovačić',      'MID', 'Croatia', 11.0, 0, true),
('Ivan Perišić',       'FWD', 'Croatia', 10.0, 0, true),
('Andrej Kramarić',    'FWD', 'Croatia', 9.5,  0, true),

-- South Korea
('Kim Seung-gyu',      'GK',  'South Korea', 8.0,  0, true),
('Kim Min-jae',        'DEF', 'South Korea', 9.0,  0, true),
('Lee Jae-sung',       'MID', 'South Korea', 7.5,  0, true),
('Lee Kang-in',        'MID', 'South Korea', 8.5,  0, true),
('Son Heung-min',      'FWD', 'South Korea', 10.0, 0, true),
('Hwang Hee-chan',     'FWD', 'South Korea', 8.0,  0, true),

-- Ghana
('Lawrence Ati-Zigi',  'GK',  'Ghana', 6.0, 0, true),
('Thomas Partey',      'MID', 'Ghana', 8.0, 0, true),
('Mohammed Kudus',     'FWD', 'Ghana', 9.0, 0, true),
('Jordan Ayew',        'FWD', 'Ghana', 7.5, 0, true),
('André Ayew',         'FWD', 'Ghana', 7.0, 0, true),

-- Tunisia
('Aymen Dahmen',       'GK',  'Tunisia', 6.0, 0, true),
('Ellyes Skhiri',      'MID', 'Tunisia', 6.5, 0, true),
('Wahbi Khazri',       'FWD', 'Tunisia', 6.5, 0, true),
('Seifeddine Jaziri',  'FWD', 'Tunisia', 6.0, 0, true),

-- Cameroon
('André Onana',        'GK',  'Cameroon', 8.0, 0, true),
('Nicolas Nkoulou',    'DEF', 'Cameroon', 7.0, 0, true),
('André-Frank Zambo Anguissa', 'MID', 'Cameroon', 8.0, 0, true),
('Vincent Aboubakar',  'FWD', 'Cameroon', 8.5, 0, true),
('Karl Toko Ekambi',   'FWD', 'Cameroon', 8.0, 0, true);
