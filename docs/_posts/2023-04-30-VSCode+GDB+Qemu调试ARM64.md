---
layout: post
title: VSCode+GDB+Qemu调试ARM64 linux内核 作者：Yuhao 知乎转载
date: 2023-04-30 19:23 
last_modified_at: 2023-04-30 19:23 
tags: [Linux内核,转载]
author: Daniel
toc: true
---
### 常用命令

```shell
#当编译完成之后，每次打开虚拟机，你都需要执行这条命令，以调试linuxx内核
/usr/local/bin/qemu-system-aarch64 -m 512M -smp 4 -cpu cortex-a57 -machine virt -kernel arch/arm64/boot/Image -append "rdinit=/linuxrc nokaslr console=ttyAMA0 loglevel=8" -nographic -s
```

### 调试环境配置

转载[VSCode+GDB+Qemu调试ARM64 linux内核](https://zhuanlan.zhihu.com/p/510289859) https://zhuanlan.zhihu.com/p/510289859

#### 安装编译工具链

```shell
sudo apt-get install gcc-aarch64-linux-gnu
sudo apt-get install libncurses5-dev  build-essential git bison flex libssl-dev
```

#### 使用busybox制作根文件系统

```shell
#下载busybox
wget  https://busybox.net/downloads/busybox-1.33.1.tar.bz2
tar -xjf busybox-1.33.1.tar.bz2
cd busybox-1.33.1
#选择编译选项
make menuconfig
Settings --->
 [*] Build static binary (no shared libs) 
#指定编译工具链
export ARCH=arm64
export CROSS_COMPILE=aarch64-linux-gnu-
#编译
make
make install
#编译完成时，会在busybox目录下生成_install目录
#文件系统的定制
#添加etc dev lib 目录
mkdir etc dev lib
#在ect下创建profile文件
#!/bin/sh
export HOSTNAME=bryant
export USER=root
export HOME=/home
export PS1="[$USER@$HOSTNAME \W]\# "
PATH=/bin:/sbin:/usr/bin:/usr/sbin
LD_LIBRARY_PATH=/lib:/usr/lib:$LD_LIBRARY_PATH
export PATH LD_LIBRARY_PATH
#在ect下创建inittab文件
::sysinit:/etc/init.d/rcS
::respawn:-/bin/sh
::askfirst:-/bin/sh
::ctrlaltdel:/bin/umount -a -r
#在ect下创建fstab文件
#device  mount-point    type     options   dump   fsck order
proc /proc proc defaults 0 0
tmpfs /tmp tmpfs defaults 0 0
sysfs /sys sysfs defaults 0 0
tmpfs /dev tmpfs defaults 0 0
debugfs /sys/kernel/debug debugfs defaults 0 0
kmod_mount /mnt 9p trans=virtio 0 0
#在ect下创建init.d/rcS文件
mkdir -p /sys
mkdir -p /tmp
mkdir -p /proc
mkdir -p /mnt
/bin/mount -a
mkdir -p /dev/pts
mount -t devpts devpts /dev/pts
echo /sbin/mdev > /proc/sys/kernel/hotplug
mdev -s
#在dev目录下创建console节点
sudo mknod console c 5 1
#在lib目录下执行拷贝
cp /usr/aarch64-linux-gnu/lib/*.so*  -a .
```

#### 编译内核

```shell
#根据arch/arm64/configs/defconfig 文件生成.config
make defconfig ARCH=arm64
#往生成的.config文件添加配置
CONFIG_DEBUG_INFO=y 
CONFIG_INITRAMFS_SOURCE="./root"
CONFIG_INITRAMFS_ROOT_UID=0
CONFIG_INITRAMFS_ROOT_GID=0
#根据需求查看是否需要打开下面配置项
CONFIG_RANDOMIZE_BASE=n
CONFIG_DEBUG_KERNEL=y
CONFIG_DEBUG_SLAB=y
CONFIG_DEBUG_PAGEALLOC=y
CONFIG_DEBUG_SPINLOCK=y
CONFIG_DEBUG_SPINLOCK_SLEEP=y
CONFIG_INIT_DEBUG=y
#将制作好的根文件系统cp到root目录下
sudo cp -r ../busybox-1.33.1/_install root
#执行编译命令
make ARCH=arm64 Image -j8  CROSS_COMPILE=aarch64-linux-gnu-
```

#### 编译内核相关

```shell
#删除编译的中间文件，保留配置文件
make clean
#删除包括配置文件的所有构建文件
make mrproper
#构建所有目标
make all
#构建内核映像
make Image
#构建所有驱动
make modules
```



#### qemu的下载

```shell
#下载工具链
apt-get install build-essential zlib1g-dev pkg-config libglib2.0-dev binutils-dev libboost-all-dev autoconf libtool libssl-dev libpixman-1-dev libpython-dev python-pip python-capstone virtualenv
#下载qemu
wget https://download.qemu.org/qemu-4.2.1.tar.xz
tar xvJf qemu-4.2.1.tar.xz
cd qemu-4.2.1
#编译qemu
./configure --target-list=x86_64-softmmu,x86_64-linux-user,arm-softmmu,arm-linux-user,aarch64-softmmu,aarch64-linux-user --enable-kvm
make 
sudo make install
```

#### 启动内核

```shell
#-m 512M 内存为512M
#-smp 4 4核
#-cpu cortex-a57cpu 为cortex-a57
#-kernel kernel镜像文件
#-nographic禁止图形输出
#-s监听gdb端口， gdb程序可以通过1234这个端口连上来。
/usr/local/bin/qemu-system-aarch64 -m 512M -smp 4 -cpu cortex-a57 -machine virt -kernel arch/arm64/boot/Image -append "rdinit=/linuxrc nokaslr console=ttyAMA0 loglevel=8" -nographic -s
```

#### 安装vscode-server

```shell
#点击顶部采用中（帮助/Help），选择(关于/about)
#将信息复制下来，保存其中的Commit信息
Commit: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#将Commit信息替换commit_id的信息，并下载
wget https://update.code.visualstudio.com/commit:commit_id/server-linux-x64/stable
#创建目录
mkdir -p ~/.vscode-server/bin
#将下载得到的stable文件移动到新建的目录
cp stable ~/.vscode-server/bin
tar -zxvf stable
#将解压成的文件命名为commit_id
cd ~/.vscode-server/bin/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
touch 0
```

打开本地的VSCode点击进行远程连接

- 第一步

![image-20230502134601468](https://cdn.jsdelivr.net/gh/JJcodo/Pictures@main/blog_picture/image-20230502134601468.png)



- 第二步

![image-20230502134704241](https://cdn.jsdelivr.net/gh/JJcodo/Pictures@main/blog_picture/image-20230502134704241.png)

- 第三步- 添加配置文件，配置文件如图所示

  ![image-20230502134918567](https://cdn.jsdelivr.net/gh/JJcodo/Pictures@main/blog_picture/image-20230502134918567.png)

```shell
#自动启动配置
# 安装systemd
sudo apt-get update
sudo apt-get install systemd
#
sudo vim /etc/systemd/system/vscode-server.service
#配置文件内存
[Unit]
Description=Visual Studio Code Server
After=network.target

[Service]
Type=simple
ExecStart=~/.vscode-server/bin/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/code-server
Restart=on-failure

[Install]
WantedBy=multi-user.target

chmod +x /etc/systemd/system/vscode-server.service
#重新加载配置
sudo systemctl daemon-reload
#启动VSCode服务器并设置它在系统启动时自动启动
sudo systemctl start vscode-server
sudo systemctl enable vscode-server

```

点击连接之后输入密码即可完成连接

远程连接参考这里

[使用 vscode + Remote-SSH 插件 + vscode-server 进行远程开发 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/493050003)

#### 虚拟机安装gdb-multiarch



```shell
#gdb-multiarch支持多种架构的调试
sudo apt-get install gdb-multiarch
```

#### 配置launch.json

```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "kernel debug",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/vmlinux",
            "cwd": "${workspaceFolder}",
            "MIMode": "gdb",
            "miDebuggerPath":"/usr/bin/gdb-multiarch",
            "miDebuggerServerAddress": "192.168.0.106:1234"
        }
    ]
}
```

这个文章很详细，[点击这里](https://zhuanlan.zhihu.com/p/510289859)，完全可用，感谢[Jason](https://github.com/ridiJason)  :smile:

