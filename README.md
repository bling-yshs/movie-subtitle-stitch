---
type: "always_apply"
---

# 总体架构

- 使用 vue3
- 使用 typescript
- 使用 pnpm 包管理器，任何 npm 命令都要换成 pnpm 命令
- 使用 tailwind v4,shadcn-vue,vue-router
- 使用 fetch 进行网络请求

# UI组件规范

- 只能使用 shadcn-vue 的组件，在没有允许的情况下，不允许自己新建任何组件
- 缺少 shadcn-vue 的组件时，可以执行命令 pnpm dlx shadcn-vue@latest add [component] 来安装

# 编码规范

- 不允许编写任何测试
- 编写完代码以后进行验证，我会自己测试
- 在每次修改结束以后，都需要运行 pnpm biome check --write ./src 命令进行格式化
- 前端vue的script里的函数不要用带变量的箭头函数，尽量使用命名函数
- 所有的日志都使用中文
