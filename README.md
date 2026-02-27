# Classic Snake

一个最小化、无依赖的经典贪吃蛇小游戏，纯静态页面实现。

## 运行

方式一：直接打开文件
- 打开 `index.html`

方式二：本地静态服务器（推荐）
```bash
cd "/Users/lc/Documents/New project"
python3 -m http.server 8000
```
浏览器访问：`http://localhost:8000/`

## 操作

- 方向键 / WASD：移动
- 空格 / 回车：暂停 / 继续（游戏结束时重开）
- 速度滑块：1（最慢）到 10（最快）
- 声音开关：开/关音效

## 功能

- 网格移动、吃食物增长、计分
- 撞墙/撞自己判定游戏结束
- 重新开始与暂停
- 移动端方向按钮
- 基本音效

## 文件结构

- `index.html` 页面结构
- `style.css` 样式
- `script.js` 游戏逻辑与渲染
