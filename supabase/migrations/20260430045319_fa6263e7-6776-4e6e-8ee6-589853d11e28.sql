UPDATE public.campaign_tiers SET probability_weight = 0.0003 WHERE label = 'A';
UPDATE public.campaign_tiers SET probability_weight = 0.0005 WHERE label = 'B';
UPDATE public.campaign_tiers SET probability_weight = 0.9992 WHERE label = 'C';
UPDATE public.campaign_tiers SET probability_weight = 0 WHERE label = 'S';