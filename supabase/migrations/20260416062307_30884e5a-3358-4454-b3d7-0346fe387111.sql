UPDATE user_inventory ui
SET coin_value = tp.coin_value
FROM tier_prizes tp
WHERE tp.name = ui.prize_name
  AND tp.coin_value > 0
  AND tp.coin_value != ui.coin_value;