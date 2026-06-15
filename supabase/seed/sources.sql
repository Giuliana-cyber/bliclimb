-- Sembrar las fuentes curadas para ingesta.
-- Ejecutar DESPUÉS de 0001_init.sql.
-- Los chunks se llenan luego con el pipeline de ingesta (Fase 3).

insert into public.sources (kind, name, url, language, author, description) values
  -- YouTube · entrenamiento estructurado
  ('youtube_channel', 'Lattice Training',                'https://www.youtube.com/@LatticeTraining',        'en', 'Lattice Training', 'Ciencia del entrenamiento de escalada'),
  ('youtube_channel', 'Power Company Climbing',          'https://www.youtube.com/@powercompanyclimbing',    'en', 'Kris Hampton',     'Coaching y programación estructurada'),
  ('youtube_channel', 'Hooper''s Beta',                  'https://www.youtube.com/@HoopersBeta',             'en', 'Jason Hooper',     'Biomecánica y prevención de lesiones'),
  ('youtube_channel', 'Training4climbing',               'https://www.youtube.com/@training4climbing',       'en', 'Eric Hörst',       'Pionero del entrenamiento de escalada'),
  ('youtube_channel', 'Climb Strong',                    'https://www.youtube.com/@climbstrong',             'en', 'Steve Bechtel',    'Programación para escaladores'),
  ('youtube_channel', 'Dave MacLeod',                    'https://www.youtube.com/@DaveMacLeod',             'en', 'Dave MacLeod',     'Fuerza-resistencia y técnica avanzada'),
  ('youtube_channel', 'Catalyst Climbing',               'https://www.youtube.com/@CatalystClimbing',        'en', 'Catalyst Climbing','Programación y educación'),
  ('youtube_channel', 'How to use a fingerboard for climbing', 'https://www.youtube.com/results?search_query=how+to+use+a+fingerboard+for+climbing', 'en', null, 'Recursos específicos de fingerboard'),

  -- YouTube · práctico / inspiración
  ('youtube_channel', 'Magnus Midtbø',                   'https://www.youtube.com/@MagnusMidtbo',            'en', 'Magnus Midtbø',    'Volumen y entrenamiento práctico'),
  ('youtube_channel', 'The Nugget Climbing',             'https://www.youtube.com/@TheNuggetClimbing',       'en', 'Steven Dimmitt',   'Podcast con coaches y atletas top'),
  ('youtube_channel', 'Hannah Morris Bouldering',        'https://www.youtube.com/@HannahMorrisBouldering',  'en', 'Hannah Morris',    'Bouldering y proceso de proyecto'),
  ('youtube_channel', 'Tom Merrick',                     'https://www.youtube.com/@TomMerrick',              'en', 'Tom Merrick',      'Movilidad y calistenia'),

  -- YouTube · movilidad / yoga / cuerpo
  ('youtube_channel', 'Movement for Climbers',           'https://www.youtube.com/@MovementForClimbers',     'en', null,               'Movilidad específica para escaladores'),
  ('youtube_channel', 'Yoga with Ieva Luna',             'https://www.youtube.com/@yogawithIevaLuna',        'en', 'Ieva Luna',        'Yoga para escaladores'),
  ('youtube_channel', 'The Climbing Doctor',             'https://www.youtube.com/@TheClimbingDoctor',       'en', 'Dr. Jared Vagy',   'Lesiones y rehabilitación'),

  -- Blogs
  ('blog', 'TrainingForClimbing',         'https://trainingforclimbing.com/',              'en', 'Eric Hörst',       'Blog del autor de los libros clásicos'),
  ('blog', 'Power Company Climbing Blog', 'https://www.powercompanyclimbing.com/blog',     'en', 'Kris Hampton',     'Coaching y planificación'),
  ('blog', 'Lattice Training Blog',       'https://latticetraining.com/blog/',             'en', 'Lattice',          'Investigación y artículos'),
  ('blog', 'Climb Strong Blog',           'https://www.climbstrong.com/education',         'en', 'Steve Bechtel',    'Educación de entrenamiento'),
  ('blog', 'Crimpd',                      'https://www.crimpd.com/blog',                   'en', null,               'Blog + base de ejercicios'),
  ('blog', 'Climbing Magazine · Training','https://www.climbing.com/skills/',              'en', null,               'Revista — sección training/skills'),
  ('blog', '8a.nu',                       'https://www.8a.nu/news',                        'multi', null,             'Noticias y entrevistas'),
  ('blog', 'escalada.es / Desnivel',      'https://www.desnivel.com/escalada/',            'es', null,               'Revista hispana de escalada')
on conflict do nothing;
