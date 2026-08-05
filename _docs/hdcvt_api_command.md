| 履历页 |
| 序号 | 更改内容摘要描述 | 版本 | 修订人 | 修订日期 |
| 1 | 新版发行 | 1.0 | 陈万培 | 2024-03-19 |
|  |
| 批 准：    日 期： | 审 核：    日 期： | 制 作：    日 期： |

目  录

Overview	4

Introduction	4

Usage Instructions	4

Important Concepts	4

ASPEED module API reference (Common APIs for both Encoder and Decoder)	4

Setting and Obtaining the SSH Service	4

Setting SSH Login Service	4

Getting SSH Login Service	5

Setting and Obtaining the Telnet Service	5

Setting Telnet Login Service	5

Getting Telnet Login Service	6

Setting and Obtaining the IR wire mode	6

Setting IR wire mode	6

Getting IR wire mode	7

Setting and Obtaining the Capture function	8

Setting Capture function	8

Getting Capture function	8

Setting and Obtaining Dante Mode	9

Setting Dante Mode	9

Getting Dante Mode	10

Setting and Obtaining the LLDP function	13

Setting LLDP function	13

Getting LLDP function	13

Setting and Obtaining the Web Service function	14

Setting Web Service function	14

Getting Web Service function	15

Setting and Obtaining the Relay function	15

Setting Relay function	15

Getting Relay function	16

Setting and Obtaining the IO function	17

Setting IO function	17

Getting IO function	19

Setting and Obtaining the Mcu Debug function	20

Setting Mcu Debug function	20

Getting Mcu Debug function	21

Setting and Obtaining thePanel function	22

Setting Panel function	22

Getting Panel function	24

Setting and Obtaining the Fcmode function	24

Setting Fcmode function	24

Getting Fcmode function	24

API commands only for ENCODER	25

Setting and Obtaining Edid	25

Setting Edid	25

Getting Edid	26

Setting HDMI OUT CEC guest mode code	27

Setting and Obtaining the HDMI OUT HDCP function	27

Setting HDMI OUT HDCP Rule	27

Getting HDMI OUT HDCP Rule	30

API commands only for DECODER	30

Setting and Obtaining Video Out Resolution	30

Setting Video Out Resolution	30

Getting Video Out Resolution	31

Setting and Obtaining the HDMI OUT HDCP function	32

Setting HDMI OUT HDCP Rule	32

Getting HDMI OUT HDCP Rule	35

## Overview

## Introduction

Intended Audience This document describes new specifications and common open API instructions based on ASPEED. This document is intended for test engineers and software engineers.

## Usage Instructions

Before using API commands on a device, you need to use SSH or TELNET in putty to remotely log in to the device to interact with API commands.

Telnet login name is root, password is 17909.

SSH login name is root, password is 17909.

## Important Concepts

## ASPEED module API reference (Common APIs for both Encoder and Decoder)

## Setting and Obtaining the SSH Service

## Setting SSH Login Service

| SET API |
| astparam s en_ssh xxx |
| describe |
| Enable or disable the SSH service. |
| parameter | describe |
| xxx = n | Disable SSH SERVIE. |
| xxx = y | Enable SSH SERVICE. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable SSH. astparam s en_ssh y astparam save reboot -f  1.Disable SSH. astparam s en_ssh n astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Enable SSH. e e_en_ssh_service::on  1.Disable SSH. e e_en_ssh_service::off |

## Getting SSH Login Service

| GET API |
| astparam g en_ssh |
| describe |
| Obtain the SSH service status. |
| return value | describe |
| not defined | Default is y. |
| y/n | y=Enable. n=Disable. |
| example |
| astparam g en_ssh y |

## Setting and Obtaining the Telnet Service

## Setting Telnet Login Service

| SET API |
| astparam s en_telnet xxx |
| describe |
| Enable or disable the Telnet service. |
| parameter | describe |
| xxx = n | Disable Telnet SERVIE. |
| xxx = y | Enable Telnet SERVICE. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable Telnet astparam s en_telnet y astparam save reboot -f  1.Disable Telnet astparam s en_telnet n astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Enable Telnet e e_en_telnetd_service::on::port The port property can be customized，such as e e_en_telnetd_service::on::30. The port number can not be used by another process, such as 22/25. The usual recommendation is 24.  1.Disable Telnet e e_en_telnetd_service::off |

## Getting Telnet Login Service

| GET API |
| astparam g en_telnet |
| describe |
| Obtain the Telnet service status. |
| return value | describe |
| not defined | Default is y. |
| y/n | y=Enable, n=Disable. |
| example |
| astparam g en_telnet y |

## Setting and Obtaining the IR wire mode

## Setting IR wire mode

| SET API |
| astparam s irmode xxx |
| describe |
| Select IR wire(e.g. 5v or 12v)  The 5v wire can be set or obtained through ir5vtype, and the default is the factory configuration. " unstandard" means HDCVT 5v IR wire. astparam s ir5vtype standard astparam s ir5vtype unstandard |
| parameter | describe |
| xxx = 5v | Use 5v IR wire. ’v’ v must be lowercase. |
| xxx = y | Use 12v IR wire. ’v’ v must be lowercase. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Use 5v IR wire astparam s irmode 5v astparam save reboot -f  1. Use 12v IR wire astparam s irmode 12v astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1. Use 5v IR unstandard wire e e_irmode::5v::unstandard   2. Use 5v IR standard wire e e_irmode::5v::standard  3. Use 12v IR wire e e_irmode::12v |

## Getting IR wire mode

| GET API |
| astparam g irmode |
| describe |
| Obtain the IR wire mode. |
| return value | describe |
| not defined | Default is 12v |
| 12v/5v | 12v: Use 12v IR wire. 5v: Use 5v IR wire. |
| example |
| astparam g irmode y  The 5v wire can be set or obtained through ir5vtype, and the default is the factory configuration. astparam g ir5vtype standard  astparam g ir5vtype unstandard |

## Setting and Obtaining the Capture function

## Setting Capture function

| SET API |
| astparam s en_autocap xxx |
| describe |
| Enable capture mode. (ast1520) It will be replace by MJPEG stream on ast1530+ast1535 chip platform. Use /www/cap.bmp to get picture. It will be taking effect on reboot system. |
| parameter | describe |
| xxx = y | Enable capture function. |
| xxx = n | Disable capture function. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable capture mode astparam s en_autocap y astparam save reboot -f  1. Disable capture mode astparam s en_autocap n astparam save reboot -f |

## Getting Capture function

| GET API |
| astparam g en_autocap |
| describe |
| Obtain capture mode. (ast1520) It will be replace by mjeg stream on ast1530+ast1535 chip platform. Use /www/cap.bmp to get picture. It will be take effect on reboot system. |
| return value | describe |
| not defined | Default is y. |
| y/n | y=Enable capture function.  n= Disable capture function. |
| example |
| astparam g en_autocap y |

## Setting and Obtaining Dante Mode

## Setting Dante Mode

| SET API |
| astparam s xxx yyy  xxx: "xxx" is the Ast parameter in the following table. yyy: "yyy" is the Value in the following table. |
| describe |
| See the above table for specific parameters. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable Dante mode astparam s dante_trial_mode y astparam s a_addon dante astparam save reboot -f |

## Getting Dante Mode

| GET API |
| astparam g xxx yyy  xxx: "xxx" is the Ast parameter in the following table. yyy: "yyy" is the Value in the following table. |
| describe |
| See the above table for specific parameters. |
| example |
| astparam g dante_trial_mode y |

## Setting and Obtaining the LLDP function

## Setting LLDP function

| SET API |
| astparam s en_lldp xxx |
| describe |
| Link Layer Discovery Protocol (LLDP) is a layer 2 neighbor discovery protocol that allows devices to advertise device information to their directly connected peers/neighbors. It is best practice to enable LLDP globally to standardize network topology across all devices if you have a multi-vendor network. |
| parameter | describe |
| xxx = y | Enable LLDP function. |
| xxx = n | Disable LLDP function. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable LLDP function. astparam s en_lldp y astparam save reboot -f  2. Disable LLDP function. astparam s en_lldp n astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Enable LLDP function. e e_lldp_service::on 2. Disable LLDP function. e e_lldp_service::off |

## Getting LLDP function

| GET API |
| astparam g en_lldp |
| describe |
| Link Layer Discovery Protocol (LLDP) is a layer 2 neighbor discovery protocol that allows devices to advertise device information to their directly connected peers/neighbors. It is best practice to enable LLDP globally to standardize network topology across all devices if you have a multi-vendor network. |
| return value | describe |
| not defined | Default is n. |
| y/n | y=Enable LLDP function. n= Disable LLDP function. |
| example |
| astparam g en_lldp y |

## Setting and Obtaining the Web Service function

## Setting Web Service function

| SET API |
| astparam s en_lighttpd xxx |
| describe |
| Enable/Disable built-in web services. |
| parameter | describe |
| xxx = y | Enable web service function. |
| xxx = n | Disable web service function. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable web service function. astparam s en_lighttpd y astparam save reboot -f  2. Disable web service function. astparam s en_lighttpd n astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Enable web service function with http and port. e e_web_service::on::http::80 2.Enable web service function with https and port. e e_web_service::on::https::80 3.Disable web service function. e e_web_service::off |

## Getting Web Service function

| GET API |
| astparam g en_lighttpd |
| describe |
| Obtain the web service status. |
| return value | describe |
| not defined | Default is y. |
| y/n | y=Enable web service function.  n= Disable web service function. |
| example |
| astparam g en_lighttpd y |

## Setting and Obtaining the Relay function

## Setting Relay function

| SET API |
| astparam s relay1status xxx astparam s relay2status xxx |
| describe |
| Open/Close the relay1 or relay2. |
| parameter | describe |
| xxx = y | Relay1 or Relay2 magnet closes. |
| xxx = n | Relay1 or Relay magnet opens. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Relay1 magnet closes. astparam s relay1status y astparam save reboot -f  2.Relay1 magnet opens. astparam s relay1status n astparam save reboot -f  3.Relay2 magnet closes. astparam s relay2status y astparam save reboot -f  4.Relay2 magnet opens. astparam s relay2status n astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Relay1 magnet closes. e e_relay_status::1::y 2.Relay1 magnet opens. e e_relay_status::1::n 3.Relay2 magnet closes. e e_relay_status::2::y 4.Relay2 magnet opens. e e_relay_status::2::n |

## Getting Relay function

| GET API |
| astparam g relay1status astparam g relay2status |
| describe |
| Obtain the relay1 or relay magnet status. |
| return value | describe |
| not defined | Default is n. |
| y/n | y=Relay1 or Relay2 magnet closes. n=Relay1 or Relay2 magnet opens. |
| example |
| astparam g relay1status y astparam g relay2status n |

## Setting and Obtaining the IO function

## Setting IO function

| SET API |
| astparam s iolevel xxx astparam s io1mode yyy astparam s io2mode yyy astparam s io1status zzz astparam s io2status zzz |
| describe |
| Setting Digital IO function |
| parameter | describe |
| xxx = 5v | Setting output 5v level. |
| xxx = 12v | Setting output 12v level. |
| yyy = out | Setting IO1 or IO2 to input detection mode. |
| yyy = in | Setting IO1 or IO2 to input detection mode. |
| zzz = y | Setting IO1 or IO2 to output high level. |
| zzz = n | Setting IO1 or IO2 to output low level. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Setting IO1 output 12v level. astparam s iolevel 12v astparam s io1mod out astparam s io1status y astparam save reboot -f  2.Setting IO1 output 5v level. astparam s iolevel 5v astparam s io1mod out astparam s io1status y astparam save reboot -f  3.Setting IO2output 12v level. astparam s iolevel 12v astparam s io2mod out astparam s io2status y astparam save reboot -f  4.Setting IO2 output 5v level. astparam s iolevel 5v astparam s io2mod out astparam s io2status y astparam save reboot -f  5.Setting IO1 output low level. astparam s io1mod out astparam s io1status n astparam save reboot -f  6.Setting IO2 output low level. astparam s io2mod out astparam s io2status n astparam save reboot -f 7.Setting IO1 input mode to detect input level. Using ‘astparam g io1status’ to detect input level, when device are rebooting. astparam s io1mod in astparam save reboot -f astparam g io1status  8.Setting IO2 input mode to detect input level. Using ‘astparam g io2status’ to detect input level, when device are rebooting. astparam s io2mod in astparam save reboot -f astparam g io2status  Runtime: This means that changes to the directive take effect immediately. 1.Setting IO1 output 12v level e e_io_status::12v::1::out::y  2.Setting IO1 output 5v level e e_io_status:5v::1::out::y  3.Setting IO2output 12v level e e_io_status::12v::2::out::y  4.Setting IO2 output 5v level e e_io_status::5v::2::out::y  5.Setting IO1 output low level e e_io_status::12v::1::out::n  6.Setting IO2 output low level e e_io_status::12v::2::out::n  7.Setting IO1 input mode to detect input level. Using ‘astparam g io1status’ to detect input level. e e_io_status::12v::1::in astparam g io1status y  8.Setting IO1 input mode to detect input level. Using ‘astparam g io2status’ to detect input level. e e_io_status::12v:2::in astparam g io1status y |

## Getting IO function

| GET API |
| astparam g iolevel astparam g io1mode astparam g io2mode astparam g io1status astparam g io2status |
| describe |
| Obtain the relay1 or relay magnet status. |
| return value | describe |
| not define 12v 5v | iolevel = not define, it means using 12v level output. iolevel = 12, it means using 12v level output. iolevel = 5, it means using 5v level output. |
| not define out in | io1mode = not define, it means io output direction. io1mode = out it means io output direction. io1mode = in, it means io input direction. |
| not define out in | io2mode = not define, it means io output direction. io2mode = out it means io output direction. io2mode = in, it means io input direction. |
| not define y n | io1status = not define, it means io output low level. io1status = y it means io output high level. io1status = n, it means io output low level. When the IO direction is in input mode, io1status is the status of the detection pin. |
| not define y n | io2status = not define, it means io output low level. io2status = y it means io output high level. io2status = n, it means io output low level. When the IO direction is in input mode, io2status is the status of the detection pin. |
| example |
| astparam g io1status y |

## Setting and Obtaining the Mcu Debug function

## Setting Mcu Debug function

| SET API |
| astparam s en_mcudebuglog xxx |
| describe |
| Enable/Disable mcu debug status. |
| parameter | describe |
| xxx = y | Enable mcu debug function. |
| xxx = n | Disable mcu debug function. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1.Enable mcu debug. astparam s en_mcudebuglog y astparam save reboot -f  2.Disable mcu debug. astparam s en_mcudebuglog n astparam save reboot -f  If printing is enabled, you can use cat /var/run/serial_mcu_server.log to obtain information.  Runtime: This means that changes to the directive take effect immediately. 1. Enable mcu debug. e e_mcu_status::debug::on 2.Disable mcu debug. e e_mcu_status::debug::off  3.Rebootting mcu. e e_mcu_status::reboot  4.Reseting mcu. e e_mcu_status::reset |

## Getting Mcu Debug function

| GET API |
| astparam g en_mcudebuglog |
| describe |
| Obtain the mcu debug status. |
| return value | describe |
| not defined | Default is n. |
| y/n | y = Enable mcu debug function. n = Disable mcu debug function. |
| example |
| astparam g en_mcudebuglog y |

## Setting and Obtaining thePanel function

## Setting Panel function

| SET API |
| astparam s led_on xxx astparam s led_timer yyy astparam s panellock zzz |
| describe |
| Enable/Disable mcu debug status. |
| parameter | describe |
| xxx yyy zzz | xxx = n, digit LED = OFF. yyy is format of "tn". Leading letter "t" and following number value of 0~90. yyy = t0, this is to turn OFF at once. If yyy is set value between t1~t90, digit LED turns OFF after 1~90 seconds timeout when it was ON.  xxx = y, digit LED = ON. yyy is format of "tn". Leading letter "t" and following number value of 0~90. yyy = t0, digit LED is always ON. If yyy is set value between t1~t90, digit LED turns OFF after 1~90 seconds timeout when it was ON.  zzz = y, Set the panel lock status. After locking, it cannot be operated. Pressing the button will only light up the screen. zzz = n, Unlock panel.  Decoder cannot switch ID in video wall state. |
| return value | describe |
| 0 | success |
| example |
| Setup Time: This means that you need to restart the device after modifying the instructions. 1. Turn off the panel and LED lights astparam s led_on n astparam s led_timer t0 astparam save reboot -f   2. Turn off the panel and LED lights after 2 seconds timeout. astparam s led_on n astparam s led_timer t2 astparam save  reboot -f  3. Always on panel and LED lights. astparam s led_on y astparam s led_timer t0 astparam save   reboot -f  4. Turn off the panel and LED lights after 60s timeout. astparam s led_on y astparam s led_timer t60 astparam save  reboot -f  5. Locked Panel. astparam s panellock y astparam save  reboot -f  6. Unlocked Panel. astparam s panellock n astparam save  reboot -f  Runtime: This means that changes to the directive take effect immediately. 1. The panel is always on and unlocked. e e_front_panel_status::unlock::y::t0  2. The panel is always on and locked. e e_front_panel_status::lock::y::t0  3.The panel stays on and turns off after timeout. e e_front_panel_status::lock::y::t90 The red mark represents the panel lighting time, not the lock time. |

## Getting Panel function

| GET API |
| astparam g en_mcudebuglog |
| describe |
| Obtain the mcu debug status. |
| return value | describe |
| not defined | Default is n. |
| y/n | y = Enable mcu debug function. n = Disable mcu debug function. |
| example |
| astparam g en_mcudebuglog y |

## Setting and Obtaining the Fcmode function

PCBA V2.x only has switching function.

## Setting Fcmode function

| SET API |
| e e_fc_mode_select::xxx |
| describe |
| Set up network transmission using fiber or copper. |
| parameter | describe |
| xxx = fiber | Use Fiber. |
| xxx = copper | Use Copper. Default use. |
| return value | describe |
| 0 | success |
| example |
| Runtime: This means that changes to the directive take effect immediately. 1.Setting fiber mode. e e_fc_mode_select::fiber  2.Setting copper mode. e e_fc_mode_select::copper |

## Getting Fcmode function

| GET API |
| astparam g fcmode |
| describe |
| To obtain network transmission, use fiber or copper. |
| return value | describe |
| not defined | Default is copper. |
| fiber/copper | fiber=Use fiber.  copper=Use copper. |
| example |
| astparam g fcmode copper |

## API commands only for ENCODER

## Setting and Obtaining Edid

## Setting Edid

| SET API |
| e e_edid_select::xxx |
| describe |
| Taking effect. |
| parameter | describe |
| xxx | 00：1080PPCM20SDR 01：1080PDTS51SDR 02：1080PHD71SDR 03：1080IPCM20SDR 04：1080IDTS51SDR 05：1080IHD71SDR 06：3DPCM20SDR 07：3DDTS51SDR 08：3DHD71SDR 09：4K30444PCM20SDR 10：4K30444DTS51SDR 11：4K30444HD71SDR 12：4K60420PCM20SDR 13：4K60420DTS51SDR 14：4K60420HD71SDR 15：4K60444PCM20SDR 16：4K60444DTS51SDR 17：4K60444HD71SDR 18：4K60444PCM20HDR 19：4K60444DTS51HDR 20：4K60444HD71HDR 21：DVI1280X1024 22：DVI1920X1080 23：DVI1920X1200 |
| return value | describe |
| 0 | success |
| example |
| Runtime: This means that changes to the directive take effect immediately. e e_edid_select::1080PPCM20SDR |

## Getting Edid

| GET API |
| astparam g edid |
| describe |
| Obtain the edid |
| return value | describe |
| xxx | Default is 15. 00：1080PPCM20SDR 01：1080PDTS51SDR 02：1080PHD71SDR 03：1080IPCM20SDR 04：1080IDTS51SDR 05：1080IHD71SDR 06：3DPCM20SDR 07：3DDTS51SDR 08：3DHD71SDR 09：4K30444PCM20SDR 10：4K30444DTS51SDR 11：4K30444HD71SDR 12：4K60420PCM20SDR 13：4K60420DTS51SDR 14：4K60420HD71SDR 15：4K60444PCM20SDR 16：4K60444DTS51SDR 17：4K60444HD71SDR 18：4K60444PCM20HDR 19：4K60444DTS51HDR 20：4K60444HD71HDR 21：DVI1280X1024 22：DVI1920X1080 23：DVI1920X1200 |
| example |
| astparam g edid 00 |

## Setting HDMI OUT CEC guest mode code

| SET API |
| e e_hdmiout_cec_code::xxx |
| describe |
| Taking effect. |
| parameter | describe |
| xxx | cec code. |
| return value | describe |
| 0 | success |
| example |
| Runtime: This means that changes to the directive take effect immediately.  1. Open TV e e_hdmiout_cec_code::40_04  2.Close TV e e_hdmiout_cec_code::40_36 |

## Setting and Obtaining the HDMI OUT HDCP function

## Setting HDMI OUT HDCP Rule

| SET API |
| astparam s hdmiouthdcp xxx |
| describe |
| Setting HDMI out hdcp rules. |
| parameter | describe |
| xxx | hdcp_src, it means hdcp follow source. |
| xxx | hdcp_snk it means hdcp follow sink. |
| xxx | hdcp_off, it means hdcp always off. |
| xxx | hdcp_1p4, it means hdcp always hdcp 1.4 version. |
| xxx | hdcp_2p2, it means hdcp always hdcp 2.2 version. |
| return value | describe |
| 0 | success |
| example |
| HDCP Follow Sink Mode.   HDCP Follow Source Mode.  Setup Time: This means that you need to restart the device after modifying the instructions.  1.Setting hdcp follow source mode. astparam s hdmiouthdcp hdcp_src astparam save reboot -f  2.Setting hdcp follow sink mode. astparam s hdmiouthdcp hdcp_snk astparam save reboot -f  3.Setting hdcp follow always off. astparam s hdmiouthdcp hdcp_off astparam save reboot -f  4.Setting hdcp follow always 1.4. astparam s hdmiouthdcp hdcp_1p4 astparam save reboot -f  5.Setting hdcp follow always 2.2. astparam s hdmiouthdcp hdcp_2p2 astparam save reboot -f  Runtime: This means that changes to the directive take effect immediately. 1.Setting hdcp follow source mode. e e_hdmiout_hdcp_select::hdcp_src  2.Setting hdcp follow sink mode. e e_hdmiout_hdcp_select::hdcp_snk  3.Setting hdcp follow always off. e e_hdmiout_hdcp_select::hdcp_off  4.Setting hdcp follow always 1.4. e e_hdmiout_hdcp_select::hdcp_1p4  5.Setting hdcp follow always 2.2. e e_hdmiout_hdcp_select::hdcp_2p2 |

## Getting HDMI OUT HDCP Rule

| GET API |
| astparam g hdmiouthdcp |
| describe |
| Obtain the web service status. |
| return value | describe |
| not defined | It means hdcp follow sink. |
| hdcp_src | It means hdcp follow source. |
| hdcp_snk | It means hdcp follow sink. |
| hdcp_off | It means hdcp always off. |
| hdcp_1p4 | It  means hdcp always hdcp 1.4 version. |
| hdcp_2p2 | It means hdcp always hdcp 2.2 version. |
| example |
| astparam g hdmiouthdcp hdcp_src |

## API commands only for DECODER

## Setting and Obtaining Video Out Resolution

## Setting Video Out Resolution

| SET API |
| e e_video_genlock_scaling::xxx |
| describe |
| Select the Video Out Resolution |
| parameter | describe |
| xxx | Default is 00.It means video out resolution bypass. 00：bypass 01：1080P50 02：1080P60 03：720P50 04：720P60 05：2160P24 06：2160P30 07：2160P50 08：2160P60 09：1280x1024 10：1360x768 11：1440x900 12：1680x1050 13：1920x1200 |
| return value | describe |
| 0 | success |
| example |
| Runtime: This means that changes to the directive take effect immediately. e e_video_genlock_scaling::1080P50 |

## Getting Video Out Resolution

| GET API |
| astparam g resolution |
| describe |
| Obtain the resolution. |
| return value | describe |
| xxx | Default is 00. It means video out resolution bypass. 00：bypass 01：1080P50 02：1080P60 03：720P50 04：720P60 05：2160P24 06：2160P30 07：2160P50 08：2160P60 09：1280x1024 10：1360x768 11：1440x900 12：1680x1050 13：1920x1200 |
| example |
| astparam g resolution 01 |

## Setting and Obtaining the HDMI OUT HDCP function

## Setting HDMI OUT HDCP Rule

| SET API |
| astparam s hdcp_always_on aaa astparam s hdcp_always_on_22 bbb astparam s hdcp_always_off ccc astparam s hdcp_always_on_src ddd astparam s hdcp_always_on_snk eee |
| describe |
| Setting HDMI out hdcp rules. |
| parameter | describe |
| aaa | y = Enable hdmi out hdcp 1p4 version. n = Disable hdmi out hdcp 1p4 version. |
| bbb | y = Enable hdmi out hdcp 2p2 version. n = Disable hdmi out hdcp 2p2 version. |
| ccc | y = Enable hdmi out hdcp off. n = Disable hdmi out hdcp off. |
| ddd | y = Enable hdmi out hdcp follow sink. n = Disable hdmi out hdcp follow sink. |
| eee | y = Enable hdmi out hdcp follow source. n = Disable hdmi out hdcp 1p4 version. |
| return value | describe |
| 0 | success |
| example |
| HDCP Follow Sink Mode.   HDCP Follow Source Mode.  Setup Time: This means that you need to restart the device after modifying the instructions.  1.Setting hdcp follow source mode. astparam s hdcp_always_on_src y astparam save reboot -f  2.Setting hdcp follow sink mode. astparam s hdcp_always_on_snk y astparam save reboot -f  3.Setting hdcp follow always off. astparam s hdcp_always_off y astparam save reboot -f  4.Setting hdcp follow always 1.4. astparam s hdcp_always_on y astparam save reboot -f  5.Setting hdcp follow always 2.2. astparam s hdcp_always_on_22 y astparam save reboot -f  Setting priority: astparam s hdcp_always_on_22 > astparam s hdcp_always_on > astparam s hdcp_always_off > hdcp_always_on_snk > hdcp_always_on_src  Runtime: This means that changes to the directive take effect immediately. 1.Setting hdcp follow source mode. e e_video_hdcp_select::hdcp_src  2.Setting hdcp follow sink mode. e e_video_hdcp_select::hdcp_snk  3.Setting hdcp follow always off. e e_video_hdcp_select::hdcp_off  4.Setting hdcp follow always 1.4. e e_video_hdcp_select::hdcp_1p4  5.Setting hdcp follow always 2.2. e e_video_hdcp_select::hdcp_2p2 |

## Getting HDMI OUT HDCP Rule

| GET API |
| astparam g hdcp_always_on astparam g hdcp_always_on_22 astparam ghdcp_always_off astparam g hdcp_always_on_src astparam g hdcp_always_on_snk |
| describe |
| Obtain the video hdcp version. Default is enable hdcp_always_on_snk. |
| example |
| 1.Getting hdcp 1p4 status. astparam g hdcp_always_on n  2.Getting hdcp 2p2 status. astparam g hdcp_always_on_22 n  3.Getting hdcp off status. astparam g hdcp_always_off n  4.Getting hdcp follow sink status. astparam g hdcp_always_on_snk y  5.Getting hdcp follow source status. astparam g hdcp_always_on_src n |