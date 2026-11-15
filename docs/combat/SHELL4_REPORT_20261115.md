# 表现壳 · 2026-11-15 四班（微班）

未 commit。未开页面。未改 `src/game`。

`HALL_ENV_LINE` 补上 `gap_end`：「这一馆石台缺了末端一格。跨得过去，站不住。」`gap_mid` 没写。馆 4、馆 7 进馆前跟灼烧、无墙同一条显示路。

- `src/combatLab/render/hallEnv.ts`
- `src/combatLab/render/shellWire.test.ts`：馆 4、馆 7 门厅含「缺了末端一格」

`npm run test:combat`：100 文件 / 997 绿。

`npm run typecheck:combat`：exit 0。
