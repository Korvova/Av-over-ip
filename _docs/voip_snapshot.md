## Table of Contents:

## Revision History:

2021/02/08:

Refer AST1530+AST1535 to another doc.

2017/04/20:

Correct typo. Remove AST1510.

2016/07/01:

Revised “Known Issues and Limitation” section.

2016/05/19: First version.

## Overview:

This document describes the details on the Console APIs for snapshot features of AST1500/AST1510/AST152x SoC platform.

Video snapshot is a feature that user can capture a frame of streaming video. It is formally supported in firmware version >= A6.2.4. And following SoC platform is supported:

AST1500

AST1510

AST1520/AST1525

Note: For AST1530+AST1535, Please refer to “Snapshot and Sub-stream APIs” document.

Here are some highlight about this feature:

Frame capture outputs 32bits BMP file format.

Implemented in pure software, so, capturing frame rate performance is heavily CPU dependent.

The API is used to execute frame capture command and save as a .bmp file into device’s ramdisk.

Can capture both on host and client. They work independently.

Can specify capture BMP resolution. Higher resolution gets clear image but consumes more CPU resource and may impact video streaming performance.

To avoid impacting video stream performance, you have to capture as small image as possible.

If client is not connect to a host, you will get a dummy BMP file containing one black pixel.

There is no ‘astparam’ needed for this feature to be enabled. Just use firmware version >= A6.2.4 and it will be ready to go.

## Snapshot Commands

## How to Initiate a Frame Capture

Use following console command to initiate a frame capture:

| echo bmp 240 1 > /dev/videoip |

Where “240” means output BMP file as 240 pixel wide. Valid values are 64 to ‘screen resolution’. Other values will be cut to 64 or ‘screen resolution’ automatically. Higher value captures more pixels so that have better picture quality, but may impact video stream performance. Recommended value is 1920/8 = 240. /2, /4 and /8 … performs better.

The “1” means low priority capture, which avoid video stream been impacted. Set to ‘0’ means high priority capture, which avoids capture image tearing. Valid values are ‘0’ and ‘1’.

Default value are “240 1”. So, if you do “echo > /dev/videoip”, firmware will capture a 240 pixel wide BMP file using low priority.

## How to Read the Captured BMP file

The output BMP file will be saved into a firmware internal memory. To get the BMP file, please use following command:

| cat /dev/videoip > capture.bmp |

It will read the captured file and save it into capture.bmp.

## How to transfer Snapshot to Outside

There are several ways to do it. For example:

Put the file into web server

Use tftp or ftp protocol to send it out

Development your own network program to send it out

Since this is out of the scope of the designed Console APIs, we leave it to the developers to do it.

## Known Issues and Limitation:

[limitation] Sometimes captured image may be tearing or corrupted.

[limitation] Snapshot may impact video streaming performance. Improvement:

Capture as small image as possible

Read snapshot image chunk by chunk instead of “cat /dev/videoip > capture.bmp”. Give CPU a break to service video streaming.

[Bug][A6.2.4] Snapshot doesn’t support video rotate scenario. ⇒ Fixed in A6.3.0.

[Bug][A6.2.4~A6.2.6] Snapshot doesn’t work on AST152x client as soc_op_mode == 1. ⇒ Fixed in A6.3.0.