-- ============================================================================
--  SeuChefe Gourmet — Base de chefs para DEMONSTRAÇÃO (com fotos)
--
--  Cria contas de chef confirmadas (apenas para aparecerem no catálogo) com:
--   - avatar_url  = retrato do profissional (randomuser.me)
--   - portfolio   = fotos de comida (loremflickr) — usadas no card e no perfil
--
--  Execute no SQL Editor DEPOIS de schema.sql + policies.sql + seed.sql.
--  Idempotente: apaga os demos anteriores (@demo.seuchefe.app) e recria.
-- ============================================================================

DO $$
DECLARE
  chef jsonb;
  uid  uuid;
  cpid uuid;
  spec text;
  exp  jsonb;
  port jsonb;
  chefs jsonb := '[
    {
      "email": "camila@demo.seuchefe.app", "name": "Camila Andrade",
      "city": "São Paulo", "state": "SP",
      "photo": "https://randomuser.me/api/portraits/women/65.jpg",
      "headline": "Subchef de cozinha francesa contemporânea",
      "bio": "Sete anos em casas premiadas de São Paulo. Apaixonada por molhos clássicos e menus degustação para jantares íntimos.",
      "years": 7, "rate": 480, "rating": 4.9, "ratingCount": 38, "status": "aprovado", "available": true,
      "specialties": ["Francesa", "Contemporânea", "Confeitaria"],
      "experiences": [
        {"restaurant": "Maison Lumière", "role": "Subchef", "start": "2019-03-01", "end": ""},
        {"restaurant": "Bistrô Verão", "role": "Auxiliar de cozinha", "start": "2017-01-01", "end": "2019-02-01"}
      ],
      "portfolio": [
        {"title": "Menu degustação 5 tempos", "img": "https://loremflickr.com/640/480/fine,dining,plating?lock=11"},
        {"title": "Soufflé de chocolate", "img": "https://loremflickr.com/640/480/chocolate,dessert?lock=12"}
      ]
    },
    {
      "email": "rafael@demo.seuchefe.app", "name": "Rafael Tanaka",
      "city": "São Paulo", "state": "SP",
      "photo": "https://randomuser.me/api/portraits/men/32.jpg",
      "headline": "Auxiliar especialista em culinária japonesa",
      "bio": "Formação em sushi tradicional e cozinha izakaya. Omakase para eventos privados de até 12 pessoas.",
      "years": 5, "rate": 520, "rating": 4.7, "ratingCount": 21, "status": "aprovado", "available": true,
      "specialties": ["Japonesa", "Frutos do Mar"],
      "experiences": [{"restaurant": "Kappo Hana", "role": "Sushiman / Auxiliar", "start": "2020-06-01", "end": ""}],
      "portfolio": [
        {"title": "Omakase 10 etapas", "img": "https://loremflickr.com/640/480/sushi,japanese?lock=21"},
        {"title": "Sashimi do dia", "img": "https://loremflickr.com/640/480/sashimi?lock=22"}
      ]
    },
    {
      "email": "beatriz@demo.seuchefe.app", "name": "Beatriz Lopes",
      "city": "Campinas", "state": "SP",
      "photo": "https://randomuser.me/api/portraits/women/68.jpg",
      "headline": "Confeiteira e chef de cozinha vegana",
      "bio": "Especialista em sobremesas autorais e menus plant-based de alta gastronomia, com apresentação refinada.",
      "years": 4, "rate": 360, "rating": 4.5, "ratingCount": 14, "status": "pendente", "available": false,
      "specialties": ["Confeitaria", "Vegana", "Mediterrânea"],
      "experiences": [],
      "portfolio": [
        {"title": "Tarte de frutas vermelhas", "img": "https://loremflickr.com/640/480/tart,fruit,dessert?lock=31"},
        {"title": "Bowl vegano", "img": "https://loremflickr.com/640/480/vegan,bowl?lock=32"}
      ]
    },
    {
      "email": "henrique@demo.seuchefe.app", "name": "Henrique Salles",
      "city": "Rio de Janeiro", "state": "RJ",
      "photo": "https://randomuser.me/api/portraits/men/52.jpg",
      "headline": "Subchef de carnes e churrasco gourmet",
      "bio": "Domínio de cortes nobres, defumação e cozimento de baixa temperatura para experiências ao ar livre.",
      "years": 9, "rate": 600, "rating": 4.8, "ratingCount": 52, "status": "aprovado", "available": true,
      "specialties": ["Carnes", "Brasileira", "Contemporânea"],
      "experiences": [{"restaurant": "Brasa & Sal", "role": "Subchef", "start": "2016-02-01", "end": ""}],
      "portfolio": [
        {"title": "Costela 14h defumada", "img": "https://loremflickr.com/640/480/steak,bbq,meat?lock=41"},
        {"title": "Tábua de cortes nobres", "img": "https://loremflickr.com/640/480/grill,steak?lock=42"}
      ]
    },
    {
      "email": "giulia@demo.seuchefe.app", "name": "Giulia Bianchi",
      "city": "São Paulo", "state": "SP",
      "photo": "https://randomuser.me/api/portraits/women/44.jpg",
      "headline": "Subchef de cozinha italiana artesanal",
      "bio": "Massas frescas feitas à mão, risotos e clássicos da Toscana. Experiência em cantinas tradicionais.",
      "years": 6, "rate": 450, "rating": 4.6, "ratingCount": 27, "status": "aprovado", "available": true,
      "specialties": ["Italiana", "Mediterrânea"],
      "experiences": [{"restaurant": "Trattoria del Borgo", "role": "Subchef", "start": "2018-08-01", "end": ""}],
      "portfolio": [
        {"title": "Ravioli de burrata", "img": "https://loremflickr.com/640/480/pasta,ravioli?lock=51"},
        {"title": "Risoto de funghi", "img": "https://loremflickr.com/640/480/risotto,italian?lock=52"}
      ]
    },
    {
      "email": "lucas@demo.seuchefe.app", "name": "Lucas Ferreira",
      "city": "Belo Horizonte", "state": "MG",
      "photo": "https://randomuser.me/api/portraits/men/76.jpg",
      "headline": "Auxiliar de cozinha contemporânea brasileira",
      "bio": "Reinterpretação de pratos regionais com técnica moderna. Foco em ingredientes nacionais.",
      "years": 3, "rate": 320, "rating": 4.3, "ratingCount": 9, "status": "pendente", "available": true,
      "specialties": ["Brasileira", "Contemporânea"],
      "experiences": [{"restaurant": "Raízes Bistrô", "role": "Auxiliar de cozinha", "start": "2021-05-01", "end": ""}],
      "portfolio": [
        {"title": "Moqueca desconstruída", "img": "https://loremflickr.com/640/480/seafood,stew?lock=61"},
        {"title": "Prato autoral regional", "img": "https://loremflickr.com/640/480/gourmet,plating?lock=62"}
      ]
    }
  ]';
BEGIN
  DELETE FROM auth.users WHERE email LIKE '%@demo.seuchefe.app';

  FOR chef IN SELECT * FROM jsonb_array_elements(chefs)
  LOOP
    uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      chef->>'email', crypt('demo-123456', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', chef->>'name', 'role', 'chef'),
      now(), now(), '', '', '', ''
    );

    -- Cidade/UF + retrato do chef (foto de perfil)
    UPDATE public.profiles
      SET city = chef->>'city',
          state = chef->>'state',
          avatar_url = chef->>'photo'
      WHERE id = uid;

    INSERT INTO public.chef_profiles (
      profile_id, headline, bio, years_experience, daily_rate,
      rating_avg, rating_count, verification_status, is_available
    ) VALUES (
      uid, chef->>'headline', chef->>'bio', (chef->>'years')::int, (chef->>'rate')::numeric,
      (chef->>'rating')::numeric, (chef->>'ratingCount')::int,
      (chef->>'status')::verification_status, (chef->>'available')::boolean
    ) RETURNING id INTO cpid;

    FOR spec IN SELECT jsonb_array_elements_text(chef->'specialties')
    LOOP
      INSERT INTO public.chef_specialties (chef_id, specialty_id)
      SELECT cpid, s.id FROM public.specialties s WHERE s.name = spec
      ON CONFLICT DO NOTHING;
    END LOOP;

    FOR exp IN SELECT * FROM jsonb_array_elements(COALESCE(chef->'experiences', '[]'::jsonb))
    LOOP
      INSERT INTO public.work_experiences (chef_id, restaurant_name, role, start_date, end_date)
      VALUES (cpid, exp->>'restaurant', exp->>'role',
              (exp->>'start')::date, NULLIF(exp->>'end', '')::date);
    END LOOP;

    -- Portfólio com fotos de comida
    FOR port IN SELECT * FROM jsonb_array_elements(COALESCE(chef->'portfolio', '[]'::jsonb))
    LOOP
      INSERT INTO public.portfolio_items (chef_id, image_url, title)
      VALUES (cpid, port->>'img', port->>'title');
    END LOOP;
  END LOOP;
END $$;
