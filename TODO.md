Комментарии к  docs/scene-config-v2.md

- `Line` внутри `AutoLayout` игнорирует `y` из конфига и смещается (candy_splash, `PaytablePageContent` default: на 9 и 6.5 px по y). У `Line` нулевая высота, а `AutoLayout` раскладывает детей сам. Решение отложено (решение 7 в `plans/line-support-plan.md`, ТЗ `docs/line-support-spec.md` §7).
