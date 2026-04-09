# USBProbe TODO

## USB 通讯功能（Vendor Device 收发）

在 Rust addon 中集成 `rusb` crate，实现与 USB 设备的直接通讯。

### 范围
- Vendor Control Transfer 收发（bmRequestType 0x40/0xC0）
- Bulk Transfer 收发
- 设备打开/关闭/Claim Interface

### 架构
- Rust addon 新增 `rusb = "0.9"` 依赖
- 新增 `native/src/comm.rs` 模块，暴露 `open_device`、`control_transfer_out/in`、`bulk_transfer_out/in`、`close_device`
- Worker 线程转发通讯命令
- 设备详情新增 "通讯" 标签页（Control Transfer 面板 + Bulk Transfer 面板 + 收发历史日志）
- 配合现有 udev 规则管理解决权限问题

## 鱼缸控制面板（Fish Tank Control Panel）

最终目标：将 `fish-tank-ch32v305-monorepo-all-module` 中的 Python CLI 工具可视化，在 USBProbe 中直接控制鱼缸各模块。

### 参考项目
- 源码位置：`/home/mhpsy/code/project/fish-tank-ch32v305-monorepo-all-module`
- 8 个 CH32V305 模块通过 USB 2.0 HS Bulk EP 连接
- VID `0x1234`，PID `0x5601-0x5608`
- 帧格式：`[cmd(1), param1(1), param2(1), param3(1), data[508]]`

### 模块控制功能

| 模块 | PID | 可视化控制内容 | 对应 CLI |
|---|---|---|---|
| pump-chamber | 0x5601 | 温度监控、UV 开关、水泵/加热器调速 | `pump_chamber_tool.py` |
| water-changer | 0x5602 | 5 路水位显示、进出水泵控制、气泵开关 | `water_changer_tool.py` |
| filter-cloth | 0x5603 | 滤布电机控制、微动开关状态 | `filter_cloth_tool.py` |
| feeder | 0x5604 | 喂食触发、FSM 状态显示、加热控制 | `feeder_tool.py` |
| spotlight | 0x5605 | 3 路 RGB PWM 调光滑块 | `spotlight_tool.py` |
| main-light | 0x5606 | 3 色温 PWM 调光（3K/4K/6K） | `main_light_tool.py` |
| foreground-light | 0x5607 | 19 颗 WS2812 像素颜色控制 | `foreground_light_tool.py` |
| landscape-board | 0x5608 | 12 颗 WS2812 + 2 路水泵 PWM | `landscape_board_tool.py` |

### 命令协议速查

| 范围 | 功能 |
|---|---|
| 0x01-0x03 | GPIO 读写 |
| 0x10-0x13 | WS2812 像素控制 |
| 0x20-0x21 | DS18B20 温度读取 |
| 0x30-0x31 | PWM 占空比设置 |
| 0x40-0x42 | 喂食器状态机 |
| 0x50 | 固件版本查询 |
| 0x60-0x67 | OTA 操作 |

### 实现思路
1. 先完成上面的 USB 通讯功能（rusb 集成）
2. 自动识别 VID=0x1234 的设备，匹配到对应模块
3. 为每个模块创建专属控制面板组件（调光滑块、开关、温度图表等）
4. 复用现有的帧协议直接发送 Bulk EP 命令
