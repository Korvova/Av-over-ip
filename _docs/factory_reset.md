| 履历页 |
| 序号 | 更改内容摘要描述 | 版本 | 修订人 | 修订日期 |
| 1 | 新版发行 | 1.0 | 陈万培 | 2024-03-19 |
|  |
| 批 准：    日 期： | 审 核：    日 期： | 制 作：    日 期： |

目  录

Encoder default setting	3

ASPEED Parameters configuration	3

Decoder default setting	5

ASPEED Parameters configuration	5

## Encoder default setting

## ASPEED Parameters configuration

| no_pwrbtn = y io2status = n no_soip = n no_video = n no_hwusb = y account_info = root,Faj3Z/humNfAU,admin:user,AgAGuKRGxLvk2,user hostnamebydipswitch = n no_ir = n board_revision = 402 random_mac = n en_autocap = y en_telnet = y relay1status = n usbmode = usbhost en_ssh = y no_i2s = n io1status = n en_lighttpd = y a_io_select = hdmi share_usb_auto_mode = y reset_ch_on_boot = n io1mode = out no_cec = n no_arp = n multicast_on = n hw_mode = EA900_V2 share_usb =  hw_version = V2.2 s0_baudrate = 115200-8n1 iolevel = 12v io2mode = out irmode = 12v relay2status = n no_usb = n soip_type2 = y astaccess = y ir5vtype = unstandard netmask = 255.255.0.0 ipaddr = 169.254.100.254 ip_mode = autoip fw_use_partition = a boot_update_flag = y verify = yes |

New Parameters(Unique Parameters of HDCVT design)

fw_use_partition: A/B System startup indicator which is a mechanism designed by HDCVT results in device never bricked.

en_autocap: Inherited from ast1520 capture mode, it enables to capture an image to /www/cap.bmp.

hw_mode: HDCVT project name: EA900

hw_version：Hardware PCBA version.

boot_update_flag: boot version update flag.

irmode: 5v IR level.

ir5vtype: HDCVT IR Wire.

en_lighttpd: Web Server switch Enable/Disable. Default is Enable.

account_info: Telnet or SSH login username and password. Default username is root, password is 17909.

en_telnet: Telnet switch Enable/Disable. Default is Enable.

en_ssh: SSH switch Enable/Disable. Default is Enable.

ip_mode: The ip mode is autoip, which automatically detects whether the same IP appears in the network and automatically assigns the network segment 169.254.xxx.xxx.

Other points:

Relay 1/2 is not conducting by default.

IO 1/2 defaults to 12V output mode and outputs low level.

EDID uses 4K2K60_420_Stereo_Audio_2.0_SDR by default.

MJPG sub-stream preview enabled by default.

If the device is authorized, the dante function is always enabled by default. Only after the dante function of the device is enabled can you configure whether to enable dante vlan mode.

How to restore factory settings?

1. During the device startup process, press and hold the reset button on the front panel for 3 seconds.

2. Click Factory Reset button in the device properties bar on the controller web page.

3. The command set enc 01 reset is issued through the controller API interaction background.

SET ENC [enc] RESET : Set the encoder factory reset.

See the All About astparam.docx documentation for official parameter configurations.

## Decoder default setting

## ASPEED Parameters configuration

| no_pwrbtn = y io2status = n no_soip = n no_video = n account_info = root,Faj3Z/humNfAU,admin:user,AgAGuKRGxLvk2,user a_arp_publish_on = y hostnamebydipswitch = n no_ir = n board_revision = 402 random_mac = n en_autocap = y en_telnet = y relay1status = n en_ssh = y no_i2s = n io1status = n en_lighttpd = y reset_ch_on_boot = n a_arp_rr = n no_cec = n no_arp = n multicast_on = n hw_mode = EA900_V2 ui_default_res = 1920x1080@60 share_usb =  hw_version = V2.0 s0_baudrate = 115200-8n1 irmode = 12v relay2status = n no_usb = n soip_type2 = y astaccess = y share_usb_auto_mode = y ir5vtype = unstandard iolevel = 12v io1mode = out io2mode = out no_hwusb = y netmask = 255.255.0.0 ipaddr = 169.254.100.254 ip_mode = autoip fw_use_partition = a verify = yes boot_update_flag = y |

New Parameters(Unique Parameters of HDCVT design)

fw_use_partition：A/B System startup indicator which is a mechanism designed by HDCVT results in device never bricked.

en_autocap：Inherited from ast1520 capture mode, it enables to capture an image to /www/cap.bmp.

hw_mode：HDCVT project name: EA900-UK0888

hw_version：Hardware PCBA version.

boot_update_flag：boot version update flag.

irmode: 5v IR level.

ir5vtype: HDCVT IR Wire.

boot_update_flag: boot version update flag.

en_lighttpd: Web Server switch Enable/Disable. Default is Enable.

account_info: Telnet or SSH login username and password. Default username is root, password is 17909.

en_telnet: Telnet switch Enable/Disable. Default is Enable.

en_ssh: SSH switch Enable/Disable. Default is Enable.

ip_mode: The ip mode is autoip, which automatically detects whether the same IP appears in the network and automatically assigns the network segment 169.254.xxx.xxx.

Other points:

Relay 1/2 is not conducting by default.

IO 1/2 defaults to 12V output mode and outputs low level.

Use HDCP FOLLOW SINK mode by default.

The default audio and video is in bypass mode.

MJPG sub-stream preview enabled by default.

If the device is authorized, the dante function is always enabled by default. Only after the dante function of the device is enabled can you configure whether to enable dante vlan mode.

How to restore factory settings?

1. During the device startup process, press and hold the reset button on the front panel for 3 seconds.

2. Click Factory Reset button in the device properties bar on the controller web page.

3. The command set enc 01 reset is issued through the controller API interaction background.

SET DEC [dec] RESET : Set the decoder factory reset.

See the All About astparam.docx documentation for official parameter configurations.