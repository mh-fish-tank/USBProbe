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
