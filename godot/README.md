# 水墨特效练习（Godot 2D）

独立工程。不进 `combat-lab.html`，不改 `sim.ts`。未点名「接入战斗」前只在这里学。

视觉：墨黑 `#1a1410` · 宣纸米 `#e8dcc4` · 朱砂 `#c0392b` 只给关键反馈。枯笔飞白。黑底白墨便于以后 screen 叠。不要厚涂、油画、赛博、日式动漫、3D 写实光影。

本窗不播 BGM/SFX。未落地的断劲 / 噬血 / 裂桩 / 剑势不要做成「已上线」演出。

网页刀光参考（只看不改）：`public/art/vfx/slash_arc.png`、`slash_line.png`；映射在 `src/art/vfxArt.ts`。现行局是透明底黑墨 + `mix-blend-mode: multiply`。练习按圣经走黑底白墨。

占位事件名：`hit` / `graze` / `break` / `kill` / `bleed-tick`。

## 课题 1 · 2D 场景

要 Godot **4.3+ 标准版**（GDScript）。不要先下 .NET 版。

1. 打开 [godotengine.org/download/macos](https://godotengine.org/download/macos)，拖进 `/Applications`。第一次从访达右键打开。
2. 项目管理器选 **Import**，指到本目录（有 `project.godot` 的这一层）。
3. 运行（F5）。应看到墨黑底，下方一条浅朱砂禁区。

节点：

| 节点 | 干什么 |
|---|---|
| `Backdrop` | 墨黑底。以后特效叠在这上面。 |
| `Stage` | 舞台原点，在画面中心。 |
| `HitAnchor` | 将来刀光 / 墨点的挂点。现在只是 Marker2D。 |
| `HudSafe` | 铁律演示：这块将来是按钮。特效不能挡。 |

编辑器里点 `HitAnchor`，视口会出现十字。下一课才往挂点上放 Sprite / 粒子。

## 下一课（先别做）

粒子 `GPUParticles2D` → 序列帧 `AnimatedSprite2D` → 短时间轴 → 透明底导出。一次一个。
