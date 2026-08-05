| 履历页 |
| 序号 | 更改内容摘要描述 | 版本 | 修订人 | 修订日期 |
| 1 | 新版发行 | 1.0 |  |
|  |
| 批 准：    日 期： | 审 核：    日 期： | 制 作：    日 期： |

## Document Introduction

[00] System Information: Switch configuration and chip features introduction.

[01] Console APIs: Open control API, including the use of astparam, osd, videowall and sub-stream.

[02] Web UI: Built-in web page usage and software upgrade guide.

[03] Firmware Update: Software program partition introduction.

[04] LED and Button: LED and initial button function introduction.

[05] Video over IP: Video switching and related API.

[06] Audio over IP (I2S): Audio switching and related API.

[07] USB over IP: USB transmission and related API.

[08] IR over IP: IR pass-through and related API.

[09] Serial over IP: Serial port pass-through and related API.

[10] Push Button over IP: Button function and pass-through, not used on EA900.

[11] CEC over IP: CEC transmission and related API.

[12] Dante AV-A: Dante AV-A User Documentation.

## GUEST MODE

## CEC Guest Mode Command

For more information, please refer to "CEC over IP and Guest Mode.docx" in the "[11] CEC over IP" folder. The following tests were performed after logging into the device.

1. CEC Guest mode For Encoder testing power ON/OFF video source.

Power off video source:

cec_send 04 36

Power on video source:

cec_send 04 44 6d

2. CEC Guest mode For Decoder testing power ON/OFF tv.

Power off tv:

cec_send 40 36

Power on tv:

cec_send 40 04

## Serial Guest Mode Command

For more information, see "How to Use Serial over IP.docx" in the [09] Serial over IP folder.

no_soip: Global RS232 over IP enable flag. "y" is disable. "n" is enable.

soip_type2: Use RS232 over IP type 2 or not. "y" use Type 2. "n" use Type 1.

s0_baudrate:

The static baudrate used under Type 2 mode. For example: "115200-8n1" means using "115200" baudrate with data bits "8", parity "None" and stop bits "1". The maximum supported baudrate is 115200.

Baudrate can be: 300 ~ 115200

Data bits can be: 5 or 6 or 7 or 8

Parity can be:

n : None

e : even

o : odd

Stop bits can be: 1 or 2

[A1.1 Firmware]soip_guest_on: Enable guest mode or not. "y" is enable. "n" is disable.

soip_type2_token_timeout: Set the default token timeout value for type 2 (in seconds). The default value is ‘1’ (second).

ch_select_soip2: Used to manually control which 'group' to join. 'ch_select_soip2' accepts only IP format, for example, 192.168.2.3. Config to target host's ip address.

Send the following commands to configure the RS-232 properties, then save the settings and reboot the device to enter guest mode. For more information, refer to the "How to Use Serial over IP.docx" document.

astparam s no_soip n

astparam s soip_type2 y

astparam s soip_guest_on y

astparam s s0_baudrate 115200-8n1

astparam save

reboot -f

Once the device is fully booted, you can create a TCP socket connection to the EA900 device and send/receive data through port 6752. The EA900 acts as a TCP socket server and your application should act as a TCP client.

## IR Guest Mode Command

For more information, see "IR Guest Mode & Software Decode.docx" in the [08] IR over IP folder. Set astparam ir_guest_on to "y" to enable IR guest mode. A device reboot is required to take effect.

ir_guest_on: Default is y.

astparam s ir_guest_ony;astparam save

The console interface allows the user to have the ASPEED device emit infrared signals. The "irs" console API command is used to send infrared signals. By using the console interface, the user can send infrared signals through telnet port 24, web protocols, or the debug console port.

Syntax

irs {PRONTO HEX}

or

irs{Global Cache format}

Example

case 1. Pronto IR format

| / # irs 0000 0067 0023 0000 0158 00b4 0014 0017 0014 0017 0013 0017 0014 0017 0014 0017 0014 0017 0014 0017 0013 0017 0014 0043 0014 0044 0014 0043 0014 0043 0014 0044 0014 0043 0014 0043 0014 0044 0014 0017 0014 0043 0013 0017 0014 0017 0014 0043 0015 0016 0014 0017 0014 0017 0014 0043 0014 0017 0014 0043 0014 0044 0014 0017 0014 0043 0014 0043 0014 0044 0013 063a 0158 005a 0014 |

case 2. Global Cache IR format

| / # irs 40000,1,1,344,180,20,23,20,23,20,23,20,23,20,23,20,23,20,23,20,23,20,67,20,68,20,67,20,67,19,68,20,67,20,67,20,68,20,23,20,23,20,67,20,67,20,67,20,23,19,23,20,23,20,67,20,68,20,23,19,23,20,23,20,67,20,67,20,68,20,1594,343,90,21,2006 |

case 2-1. Global Cache Compressed IR format

| / # irs 40000,1,1,344,180,20,23BBBBBBB,20,67,20,68CC,19,68CCDBBCCCB,19,23BCDBFBCCD,20,1594,343,90,21,2006 |