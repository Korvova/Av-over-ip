| 履历页 |
| 序号 | 更改内容摘要描述 | 版本 | 修订人 | 修订日期 |
| 1 | 新版发行 | 1.0 | 陈万培 | 2024-06-26 |
| 2 | 补充说明 | 1.1 | 陈万培 | 2024-07-15 |
|  |
| 批准：    日期： | 审核：    日期： | 制作：    日期： |

目  录

Factory Reset	3

Documentation	3

Get the device IP address	4

Use ASPEED tool [Use node query]	4

Using Common Tools [Bonjour]	5

Device login control	6

Logging in to the device via telnet	6

Log in to the device via ssh	7

Simple device control	8

Encoder configuration device ID	8

Decoder connects to Encoder	9

Encoder configures audio input	10

Decoder configures audio output	10

Encoder changes IP mode	10

Device panel control	11

Get device IP	11

Configure Video Matrix	11

Device Upgrade	13

Built-in web page upgrade	13

SFTP Upgrade	14

RS232 Guest Mode	18

## Factory Reset

During the device operation, press and hold the REST button on the device panel for 5 seconds until the POWER and LINK indicators flash and the digital tube displays "." at a frequency of 1Hz. Then release the button and wait for the device to restart. [During the device restart, the digital tube will rotate in circles to indicate system restart]

## Documentation

The documentation is located under [01] Hdcvt Documents.

[00] HDN-EA900 API Command.docx: Introduction to HDN-EA900 new API documentation.

[01] HDN-EA900 Front Panel Control.docx: HDN-EA900 panel operation instructions.

[02] HDN-EA900 Web Page.docx: HDN-EA900 built-in web page instructions.

[03] HDN-EA900 How to use aspeed api.docx: HDN-EA900 introduction to using ASPEED official API.

[04] HDN-EA900 Dante Usage V1.2.docx: HDN-EA900 series Dante related operation instructions.

[05] HDN-EA900-DANTE PC tool usage documentation v1.1.docx: HDN-EA900 Dante tool usage instructions.

[06] HDN-EA900 Decoder pic update guide.docx: HDN-EA900 upload standby picture instructions.

[07] HDN-EA902 Lan Mode.docx: HDN-EA902 dual network port configuration instructions.

[08] ASPEED LUXUL AMS-4424P switch configuration v1.0.docx: LUXUL switch configuration operation.

[09] ASPEED ZyXEL GS2210 Configuration v1.0.docx: ZyXEL switch configuration operation.

[10] Sample Configuration for IGMP Snooping of Ethernet Switch.pdf: ASPEED configuration IGMP introduction.

[11] Zyxel AVoIP Network Configuration Guide.pdf: ASPEED recommended switch configuration introduction.

[12] HDN-EA900 How to config VLAN for Dante Audio (cisco).docx: HDN-EA900 cisco configuration Dante Vlan.

[13] HDN-EA900 UDP Modify device IP.docx: HDN-EA900 modify IP through multicast.

[14] HDN-EA900 factory reset default setting.docx: How to reset HDN-EA900 and reset the default configuration.

[15] HDN-EA900 Firmware Update by SFTP v1.0.docx: Use curl to upload and upgrade the firmware.

## Get the device IP address

## Use ASPEED tool [Use node query]

The tool address is located in: [02] Utilites\node query.7z. Please unzip it before use.

After decompression, the file will be displayed as shown below.

Double-click the [node_query.bat] tool to run it.

## Using Common Tools [Bonjour]

The tool address is located in: [02] Utilites\ zeroconfServiceBrowserSetup.7z. Please unzip it before use.

The unzipped file is as shown below. [For details, please refer to Device search installation.docx installation]

After the installation is complete, click the  icon to run the program.

After running, you can observe the device IP address by viewing the World Wide Web HTTP.

## Device login control

The tool address is located in: [02] Utilites\ putty.7z. Please unzip it before use.

## Logging in to the device via telnet

Double-click the putty  icon to open it and select telnet to log in.

telnet port is 24.

telnet user name is root.

telnet user password is 17909.

## Log in to the device via ssh

双击putty图标打开，选择telnet登录。

ssh port is 22.

ssh user name is root.

ssh user password is 17909.

## Simple device control

## Encoder configuration device ID

After logging in to the device terminal via telnet or ssh, configure the device ID of the decoder device, which includes video, audio, RS232, USB, IR, CEC, etc.

As shown in the figure below, configure the device ID of one of the encoders to "0001". The command is: [ e e_reconnect::0001 ]. For detailed ASPEED commands, please refer to the documents under the path [00] Aspeed Documents\[01] Console APIs.

If you want to push a stream from one encoder to multiple decoders, you need to issue the following command to put the device in multicast mode and restart it. [The decoder also needs to be set to multicast mode, otherwise the encoder audio and video stream function cannot be obtained]

astparam s multicast_on y

astparam save

reboot -f

## Decoder connects to Encoder

After logging in to the device terminal via telnet or ssh, perform the stream pulling operation according to the ID of the configured encoder. The following commands directly obtain the encoder's video, audio, RS232, USB, IR, CEC, etc. by default.

As shown in the figure below, the device ID of one of the decoders is configured as "0001". The command is: [ e e_reconnect::0001::vasruc ]. For detailed ASPEED commands, please refer to the documents under the path [00] Aspeed Documents\[01] Console APIs.

If the encoder has been configured with multicast mode, the decoder also needs to issue the following command to put the device in multicast mode and restart. [The encoder also needs to be set to multicast mode, otherwise the encoder audio and video stream function cannot be obtained]

astparam s multicast_on y

astparam save

reboot -f

## Encoder configures audio input

To configure HDMI audio input:

astparam s a_io_select hdmi

echo hdmi > /sys/devices/platform/1500_i2s/io_select

astparam save

Configure Analog audio input:

astparam s a_io_select analog

echo analog > /sys/devices/platform/1500_i2s/io_select

astparam save

## Decoder configures audio output

By default, the decoder outputs the input audio of the encoder. The following switches need to be paid attention to after the Dante function is enabled.

After enabling Dante, select Dante audio:

e e_a_out_src_sel::addon

After enabling Dante, select Native audio:

e e_a_out_src_sel::native

[Command to start Dante trial mode]

astparam s a_addon dante

astparam s dante_trial_mode y

astparam save

reboot -f

[Command to turn off Dante mode]

astparam s a_addon none

astparam s dante_trial_mode n

astparam save

reboot -f

## Encoder changes IP mode

The encoder and decoder are in automatic IP mode by default, and the IP segment is169.254.xxx.xxx.

The encoder and decoder are in automatic IP mode by default, and the IP segment is 169.254.xxx.xxx.

1. Get the device IP address.

2. Enter the IP address in the PC browser address bar, open the web page, enter the network tab, click the automatic IP button, and click Apply to save the configuration.

3. The device needs to be restarted for it to take effect.

## Device panel control

For detailed document operation, please refer to [01] Hdcvt Documents\[01] HDN-EA900 Front Panel Control.docx

## Get device IP

Press and hold the UP button on the device for 5 seconds to scroll through the IP addresses.

## Configure Video Matrix

Encoder & Decoder Enter "CA2" on the panel configuration function page. The following Encoder operation (the Decoder mode must be consistent with the Encoder)

After entering the modification, the digital tube flashes the currently used multicast mode at 1Hz, such as "CA1".

"CA1" means unicast mode, and "CA2" means multicast mode.

The device automatically restarts after the function is modified.

If there are multiple encoders, you must modify the encoder ID through the panel. Follow the steps below.

After entering the modification, the digital tube flashes the current ID number such as "000" at 1Hz.

The device ID setting range is [0,762].

After modifying the device ID, the device automatically restarts.

The decoder can be connected directly through the panel after the multicast mode is consistent with that of the encoder. [If different decoders need to implement ID positioning, you need to modify the device ID through panel operation]

After entering the modification, the digital tube flashes the current ID number such as "000" at 1Hz.

The device ID setting range is [0.762].

After modifying the device ID, the device automatically restarts.

## Device Upgrade

## Built-in web page upgrade

For detailed document operations, please refer to [01] Hdcvt Documents\ [02] HDN-EA900 Web Page.docx

Open the web page on the PC, enter the obtained device address, and enter the IP address in the URL address bar to access.

Click and select in the order of the numbers to upload and upgrade the firmware. The upgrade is expected to take 5 minutes. [Do not cut off the power supply during the upgrade]

## SFTP Upgrade

For detailed operations, please refer to: [15] HDN-EA900 Firmware Update by SFTP v1.0.docx.

Unzip the WINSCP tool. See [02] Utilites\WinSCP-5.9.2-Portable.7z for details.

After decompression, run the WinSCP.exe program.

Select SFTP protocol, enter the device IP address and select port number 22, user name root, password 17909. After successful login, it will show that the device has entered the /root directory.

Select and enter the /dev/shm directory of the device.

Drag the firmware from the left window to the device directory on the right.

Change the device firmware name to fw.tar.gz.

Use putty.exe to log in to the device terminal and execute the command update_fw.sh &.

You can use cat /www/update_fw_info.txt to get the progress.

The upgrade progress can be obtained through fw_size_remain.js and fw_size_total.js.

## RS232 Guest Mode

For more information, see "How to Use Serial over IP.docx" in the [00] Aspeed Documents\[09] Serial over IP folder.

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

After the device is fully started, you can create a TCP socket connection with the EA900 device through port 6752 and send/receive data. The EA900 acts as a TCP socket server, and your application should act as a TCP client. Finally, you can send data to the RS232 socket of the EA900 device through the TCP connection of 6752 for output.