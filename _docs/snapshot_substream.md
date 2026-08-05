## Table of Contents

## Revision History

2023/09/25:

Known Issues and Limitation. Strike A0 chip information.

Known Issues and Limitation. Add Dolby Vision limitation.

2021/03/31:

[p.3] Add target sub-stream’s network bandwidth

[p.8] Add some more Q & A.

2021/01/28: First version.

## Overview

This document provides the details of snapshot & sub-stream features. Both snapshot and sub-stream are primarily designed for providing 3rd party control apps a fancy way to monitor video content of AVoIP devices (both host and client). Possible applications like: control app multi-view GUI, preview GUI, video wall config GUI, video stream monitor/log, client PIP (picture in picture) preview.

This feature and document applies to following ASPEED platform:

AST1530+AST1535

## Snapshot

Snapshot is a one-shot capture of current screen. The captured picture is downscaled. The features of snapshot are:

Downscale input resolution to target resolution (Can’t upscale).

Output in JPEG format.

Output resolution up to 1280x720.

Configurable JPEG encode quality.

## Sub-stream

Sub-stream offers low definition video stream which is primarily for management purpose. The features of sub-stream are:

Downscale input resolution to target resolution (Can’t upscale).

Output in Motion-JPEG format (MJPEG).

Output resolution up to 1280x720.

Configurable frame rate control. Up to 30 fps.

Configurable and auto bandwidth control.

Default/target consumed network bandwidth is < 8Mbps

To avoid consuming too much precious 1Gbps network bandwidth, sub-stream driver will automatically adjust JPEG quality in order to ensure that output stream’s data rate won’t over configured bandwidth value.

If the current output stream’s data rate is greater than the maximum bandwidth that the sub-stream can have, the jpg quality will be reduced for saving bandwidth. On the contrary, the jpg quality will be increased once the bandwidth is sufficient. If network bandwidth is still over the maximum bandwidth and jpg quality is reduced to lowest, driver will start to drop frame.

ASPEED’s recommend configure parameters are the corresponding astparam default values. ASPEED recommend adjust “resolution” and “frame rate” setting to meet your own quality requirement instead of adjust ASPEED recommended bandwidth setting.

ASPEED using the “Big Bug Bunny” & "Kyoto" stream to profile the parameter setting. The criteria are that the current sub-stream is smooth and having the good quality. The following table is the profiling data of the substream with different parameters. Under the condition of fixed bandwidth, the higher the resolution, the smaller the fps and “minimun quality”. Conversely, if user need better framerate and quality, resolution will be limited.

| Use Case | Bandwidth (Kbps) | Resolution | FPS (frame/s) | Minimum quality |
| 1 | 8000 | 640*360 | 25~30 | 60 |
| 2 | 8000 | 640*360 | 20~30 | 80 |
| 3 | 8000 | 960*540 | 15~22 | 60 |
| 4 | 8000 | 960*540 | 25~30 | 20 |

## Web APIs

Developers can use HTTP protocol to configure and get snapshot or sub-stream data. This chapter describes details of the Web APIs.

## Snapshot + Configure

Synopsis:

http://IP:PORT/?action=snapshot&w=x&h=x&q=x&as=x

Options:

w: [Optional] width.

h: [Optional] height.

q: [Optional] quality.

as: [Optional] aspect ratio configuration.

Please reference to “Driver APIs (Console APIs)” chapter for details of those options.

Example:

http:// ast4-client82C564BB84B5:8080/?action=snapshot

http://169.254.8.65:8080/?action=snapshot&w=320&h=240&q=30&as=0

## Sub-stream + Configure

Synopsis:

http://IP:PORT/?action=stream&w=x&h=x&fps=x&bw=x&as=x&mq=x

Options:

w: [Optional] width.

h: [Optional] height.

fps: [Optional] frame rate.

bw: [Optional] bandwidth.

as: [Optional] aspect ratio configuration.

mq: [Optional] minimum encode quality number.

Please reference to “Driver APIs (Console APIs)” chapter for details of those options.

Example:

http://ast4-client82C564BB84B5:8080/?action=stream

http://169.254.8.65:8080/?action=stream&w=320&h=240&fps=30&bw=8000&as=0

## Configure Only

Synopsis:

http://IP:PORT/?config=stream&w=x&h=x&fps=x&bw=x&as=x

http://IP:PORT/?config=snapshot&w=x&h=x&q=x&as=x

Options:

All options are optional. If an option is not specified, firmware will use previous configured value, otherwise system default value will be used.

Please reference to above sections and “Driver APIs (Console APIs)” chapter for details of those options.

Example:

http://169.254.8.65:8080/?config=snapshot&w=320&h=240&as=0

http://169.254.8.65:8080/?config=stream&fps=30&bw=8000&as=0

## Notice

All configuration options through Web APIs will not be saved. It will take effect immediately but won’t last after system reboot. To configure system default values, please use astparam defined in “astparam” chapter.

Reference firmware’s Web APIs doesn’t provide authentication and encryption method.

Q: Is any special software required to playback the substream?

A: Web APIs uses standard http MJPEG protocol. The stream content is raw MJPEG data. There is no special viewer application needed. Just regular web browser and protocol will do the job.

Q: How many simultaneous sub-streams can be served?

A: http is TCP and unicast only. So, adding an extra sub-stream will add extra network bandwidth loading. Since the whole system’s bottleneck will be network bandwidth. And the reference firmware tries to be as flexible as possible. So, developers/system integrators can customize the sub-stream to their needs. However, developers/system integrators will have to ensure the usage of sub-stream won't impact video main stream or other services. (by adjusting sub-stream resolution/fps/how many streams simultaneously....). Basically, ASPEED only plan/expect 8Mbps network bandwidth for sub-stream. (bandwidth is also configurable).

## Driver APIs (Console APIs)

For control app developers, Web APIs are recommended. Driver APIs are listed here for developers who want to customize firmware. For example, provide control APIs different from ASPEED provided. Developer can write their own sub-stream handling program in C code by mimic the Console APIs listed in following sections.

## Snapshot

## Initiate a frame capture

Synopsis:

echo jpg [WIDTH] [HEIGHT] [QUALITY] [AS] > /dev/videoip

echo jpg WIDTH YIELD >/dev/videoip

Options:

WIDTH: [Optional] The width of snapshot image. In pixels. ‘x’ means no change. Default is 1024.

HEIGHT: [Optional] The height of snapshot image. In pixels. ‘x’ means no change. Default is 576.

QUALITY: [Optional] The image quality range: 10, 20, …, 90, 100 (in step 10), higher setting means better image quality. ‘x’ means no change. Default is 60.

AS: [Optional] aspect ratio configuration. ‘x’ means no change. Default is 0.

0: extend to what WIDTH and HEIGHT configured

1: [A1 only] keep original aspect ratio and place in the center of output (letterboxing or pillarboxing)

YIELD: [Optional] for backward compatible with AST1520 snapshot API. It is no use in AST1530 or later platform. Only accept ‘0’ or ‘1’. Other values will be treated as new API format.

Example:

Trigger snapshot with previous setting

echo jpg x x x x> /dev/videoip

Trigger snapshot with quality setting changed only

echo jpg x x 100 x> /dev/videoip

## Read the captured file

Synopsis:

cat /dev/videoip > TARGET

Options:

TARGET: the location/name of capture file

Example:

Save capture file in /www folder and named as cap.jpg

cat /dev/videoip > /www/cap.jpg

## Sub-stream

## Start sub-stream

Synopsis:

echo start [WIDTH] [HEIGHT] [FRAMERATE] [BW] [AS] [MINQ] > /dev/stream

Options:

WIDTH: [Optional] image width. In pixels. ‘x’ means no change. Default is 640.

HEIGHT: [Optional] image height. In pixels. ‘x’ means no change. Default is 360.

FRAMERATE: [Optional] frame rate of sub-stream. Unit: fps (frame per second). ‘x’ means no change. Default is 30.

BW: [Optional] maximum bandwidth of sub-stream traffic. Unit: Kbps (Kbits per second). ‘x’ means no change. Default is 8000 (8Mbps).

AS: [Optional] aspect ratio configuration. ‘x’ means no change. Default is 0.

0: extend to what “WIDTH” and “HEIGHT” configured

1: [A1 only] keep original aspect ratio and place in the center of output (letterboxing or pillarboxing)

MINQ: [Optional] minimum image quality number. range: 10, 20, …, 90, 100 (in step 10), higher setting means better image quality. ‘x’ means no change. Default is 10. Limit driver auto bandwidth control’s minimum quality number. If quality lower then MINQ value, the driver will drop frame by returning 0 size file.

Example:

Start a 640x480 sub-stream

echo start 640 480 > /dev/stream

Start a 320x240 sub-stream with 30fps

echo start 640 480 30> /dev/stream

Start a 320x240 sub-stream with 30fps and limit target bitrate to 8Mbit/s (8000Kbit/s)

echo start 640 480 30 8000 > /dev/stream

Start a sub-stream with 10Mbit/s

echo start x x x 10000 > /dev/stream

## Stop sub-stream

Synopsis:

echo stop > /dev/stream

Example:

Stop sub-stream

echo stop > /dev/stream

## Get sub-stream data

Save single-one frame of sub-stream. To get next frame, issue this command again.

Synopsis:

cat /dev/stream > TARGET

Options:

TARGET: the location/name of capture file

Example:

Save capture file in /tmp folder and named as stream.jpg

cat /dev/stream > /tmp/stream.jpg

## Driver IOCTL and Reference C Code

Driver provides some IOCTL interfaces for user space program to precisely control driver. They are listed as below:

| Code | Name | Function | Get/Set |
| 0x1241 | IOCTL_STREAM_SIZE | Get current sub-stream image size. In bytes. | G |
| 0x1141 | IOCTL_SNAPSHOT_SIZE | Get current snapshot image size. In bytes. | G |

For detail usage and sub-stream/snapshot reference code, please reference to SDK\gpl_src\application\gpl_app\mjpg-streamer\1.0.0\patch\mjpg-streamer-experimental\plugins\input_substream\input_substream.c

Here is sub-stream program C pseudo code:

| void sub_stream_handler(void) { 	/* config and start sub-stream driver */ 	system("echo start 640 480 30 > /dev/stream");  	while (sub_stream_on) { 		/* open file for reading */ 		file = open("/dev/stream", O_RDWR);  		/* get current sub-stream image size. IOCTL_STREAM_SIZE(0x1241) */ 		ioctl(file, 0x1241, (unsigned long *)&filesize);  		/* read data. Be sure to read all/full JPEG image */ 		read_size = read(file, jpg_buffer, filesize);                  If (read_size == 0)                     drop_frame() && go to next run.  		/* 		 * driver will release current image after user read full JPEG image. 		 * And automatically capture/compress next frame. 		 */  		/* close /dev/stream file to reset fp for next frame. */ 		close(file);  		/* user handle this jpeg data */ 		handle_it(jpg_buffer, filesize); 	} } |
|  |

## Notice

[Driver Behavior] It is possible to have multiple programs to read sub-stream/snapshot at the same time. Driver maintains a reference counter to ensure a captured image is read by all users before releasing it and capture next frame. The reference counter is increased by 1 when there is a read operation from offset 0. And decrease by 1 when a read operation read to full image size.

## Link Manager APIs

Link manager sub-stream streamer control commands are used for debug development purpose only. There is no need to use those commands because streamer is and can be started on boot automatically.

## Open sub-stream & exec mjpg streamer

Synopsis:

e e_ss::start::$SS_STREAM_OPTION::$SS_SNAPSHOT_OPTION::$SS_WEB_OPTION

Options:

SS_STREAM_OPTION: see astparam, ss_stream_option, for details.

SS_SNAPSHOT_OPTION: see astparam, ss_snapshot_option, for details.

SS_WEB_OPTION: see astparam, ss_web_option, for details.

Example:

e e_ss::start::160,120,30,x,x::160,120,x::8080

## Stop sub-stream & kill mjpg streamer

Synopsis:

e e_ss::stop

Options:

none

Example:

e e_ss::stop

## Sub-stream config setting

Synopsis:

e e_ss::config::stream::$SS_STREAM_OPTION

e e_ss::config::snapshot::$SS_SNAPSHOT_OPTION

Options:

SS_STREAM_OPTION: see astparam, ss_stream_option, for details.

SS_SNAPSHOT_OPTION: see astparam, ss_snapshot_option, for details.

Example:

e e_ss::config::stream::320,240,30,x,x,x

## astparam

| Key | Description | Value (bold is FW default) | Host/ Client |
| ss_en | Enable sub-stream feature | y: Enable n: Disable | H/C |
| ss_web_option | The listening port number of sub-stream web CGI server format: PORT | 8080 | H/C |
| ss_snapshot_option | The snapshot configuration. It is a string in following format: WIDTH,HEIGHT,QUALITY,AS  WIDTH/HEIGHT is in pixel unit QUALITY range: 10~100 (in step 10), higher setting means better image quality. AS: [A1] aspect ratio configuration.  0: extend to what [WIDTH] and [HEIGHT] configured 1: [A1 only] keep original aspect ratio and place in the center of output (letterboxing or pillarboxing) | 1024,576,60,0 | H/C |
| ss_stream_option | The sub-stream configuration. It is a string in following format: WIDTH,HEIGHT,FPS,BW,AS,MINQ  WIDTH/HEIGHT is in pixel unit FPS: frame rate. Unit: frame per second BW is in Kbps MINQ: minimum quality number. range: 10, 20, …, 90, 100 AS: [A1] aspect ratio configuration.  0: extend to what WIDTH and HEIGHT configured 1: [A1 only] keep original aspect ratio and place in the center of output (letterboxing or pillarboxing) | 640,360,30,8000,0,60 | H/C |

## Known Issues and Limitation

[known Issue] Sometimes captured image may be tearing or corrupted.

[known Issue] Sub-stream may not transmit real time video.

[limitation] If user specified a high resolution sub-stream, bandwidth control function may not be able to limit output bandwidth to target value. User should reduce image resolution or lower frame rate if streaming traffic is larger than expected.

[limitation] The width & height of output image cannot be bigger than the original video (e.g., host: input video, client: output video).  current firmware will output image using original video’s resolution.

[limitation] doesn’t support color space conversion for Dolby Vision. As a result, the output color may appear distorted or unusual.

[limitation] [A0]

For 4K60Hz video timing, the maximum output size of snapshot/sub-stream is limited to 1024x576. (A1 will be 1280x720)  do not configure values larger then 1024x576.

YUV422/YUV420 is not supported.  A0 will produce wrong color.

Interlaced mode video source is not supported.  A0 will produce both field in one image.

[known Issue] [A0] Using snapshot/sub-stream will cause tearing or corrupted video main stream output of AST1530 client.