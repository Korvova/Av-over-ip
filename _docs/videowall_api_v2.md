## Table of Contents

## Scope

The purpose of this document is to provide a guide to video wall API v2 which supported after A6.4.5 (include).

This document includes:

Concepts

Video Wall Console API descriptions

Installation Procedures using console APIs

Video wall API version 2 support is only available on AST1520/AST1525 (OP_MODE = 3) and higher SoC version. Following HW platform are supported:

AST1520/AST1525

AST1530+AST1535

Video wall API version 2 extension support is only available on AST1530/AST1535 (OP_MODE = 4)
            and FW version higher than A9.18.6

AST1530+AST1535

The requirements of this document are in addition to and complement ‘AST1500 Video Wall Web Configuration Without RS232 Chain’.

## Concepts

We use 2 virtual coordinates, top left (x1, y1) and bottom right (x2, y2), to select the area of source image for scaling-up at client side.

The unit of x (x1 or x2) is in ‱ of width, range: 0 ~ 10000

The unit of y (y1 or y2) is in ‱ of height, range 0 ~ 10000

For example:

## Advanced for Black-Border (FW >= A9.18.9 b5318)

Add extra 2 virtual coordinates, top left (trgt_x1, trgt_y1) and bottom right (trgt_x2, trgt_y2), to describe the final output at client side.

The unit of x (x1 or x2) is in ‱ of width, range: 0 ~ 10000

The unit of y (y1 or y2) is in ‱ of height, range 0 ~ 10000

The unit of x (trgt_x1 or trgt_x2) is in ‱ of width, range: 0 ~ 10000

The unit of y (trgt_y1 or trgt_y2) is in ‱ of height, range 0 ~ 10000

For example:

## Video Wall Console API Setup

e_vw_enable_${MaxR}_${MaxC}_${R}_${C}_${VER}  e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_${VER} 
e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_${VER}_${TRGT_X1}_${TRGT_Y1}_${TRGT_X2}_${TRGT_Y2}

Add additional option ${VER} for e_vw_enable_${MaxR}_${MaxC}_${R}_${C}

If ${VER} not exists or exists but not ‘2’, use video wall API v1 for configuration.

If ${VER} exists and be ‘2’, use video wall API v2 to configure video wall layout.

V1: e_vw_enable_${MaxR}_${MaxC}_${R}_${C} / e_vw_enable_${MaxR}_${MaxC}_${R}_${C}_1

V2: e_vw_enable_${X1}_${Y1}_${ X2}_${Y2}_2

For V2 API,

(X1, Y1) will be the virtual coordinates of top left position.

(X2, Y2) will be the virtual coordinates of bottom right position.

the range for X1, Y1, X2, Y2 is: 0 ~ 10000.

ex: using API v2 to select an area span by virtual coordinates (5000, 5000, 10000, 10000) for scaling-up

# e e_vw_enable_5000_5000_10000_10000_2

ex: using API v2 to disable scaling up

# e e_vw_enable_0_0_0_0_2

ex: using API v1 to set client r0c1’s video wall screen layout as 2x3’s row 0 column 2.

# e e_vw_enable_1_2_0_2 or

# e e_vw_enable_1_2_0_2_1

V2 extension: 
e_vw_enable_${X1}_${Y1}_${ X2}_${Y2}_2_${TRGT_X1}_${TRGT_Y1}_${TRGT_X2}_${TRG_Y2}

For V2 Extension API,

(X1, Y1) will be the virtual coordinates of top left position.

(X2, Y2) will be the virtual coordinates of bottom right position.

(TRGT_X1, TRGT_Y1) will be the target virtual coordinates of top left position.

(TRGT_X2, TRGT_Y2) will be the target virtual coordinates of bottom right position.

the range for X1, Y1, X2, Y2, TRGT_X1, TRGT_Y1, TGRT_X2, TRGT_Y2 is: 0 ~ 10000.

ex: using API v2 extension to select an area span by virtual coordinates (5000, 5000, 10000, 10000) for scaling-up

# e e_vw_enable_5000_5000_10000_10000_2_0_0_10000_10000

ex: using API v2 extension to select an area span by virtual coordinates (1000, 1000, 5000, 5000) for scaling-up and with black-border top and down.

# e e_vw_enable_1000_1000_5000_5000_2_0_1000_10000_9000

e_vw_rotate_${rotate_type}: Set rotate type. ${rotate_type} can be ‘3’ (clockwise 180 degree) or ‘6’ (clockwise 270 degree).

ex: set rotate type to 270 degree

# e e_vw_rotate_6

Following table lists the comparison of Video Wall API support status and ast parameters (astparam):

| event command | APIv1 | APIv2 | astparam |
| e_vw_pos_layout_${maxRowPos}_${maxColPos} | ● |  | vw_pos_max_row vw_pos_max_col |
| e_vw_refresh_pos_idx_${rowPos}_${colPos} | ● |  | vw_pos_idx |
| e_vw_enable_${MaxR}_${MaxC}_${R}_${C} e_vw_enable_${MaxR}_${MaxC}_${R}_${C}_${VER}  (${VER} = 1) | ● |  | vw_ver vw_max_row, vw_max_column vw_row,vw_column |
| e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_${VER}  (${VER} = 2) |  | ● | vw_ver vw_v2_x1, vw_v2_y1, vw_v2_x2, vw_v2_y2 |
| e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_${VER}_${TRGT_X1}_${TRGT_Y1}_${TRGT_X2}_${TRGT_Y2}  (${VER} = 2) |  | ● | vw_ver vw_v2_x1, vw_v2_y1, vw_v2_x2, vw_v2_y2 vw_v2_trgt_x1, vw_v2_trgt_y1, vw_v2_trgt_x2, vw_v2_trgt_y2 |
| e_vw_moninfo_${VW}_${OW}_${VH}_${OH} | ● |  | vw_moninfo_ha, vw_moninfo_ht vw_moninfo_va, vw_moninfo_vt |
| e_vw_h_scale_${HScale} | ● |  | vw_h_scale |
| e_vw_v_scale_${VScale} | ● |  | vw_v_scale |
| e_vw_h_shift_l_${ShiftPixel} | ● |  | vw_h_shift |
| e_vw_h_shift_r_${ShiftPixel} | ● |  | vw_h_shift |
| e_vw_v_shift_u_${ShiftPixel} | ● |  | vw_v_shift |
| e_vw_v_shift_d_${ShiftPixel} | ● |  | vw_v_shift |
| e_vw_stretch_type_${stretch_type} | ● |  | vw_stretch_type |
| e_vw_rotate_${rotate_type} | ● | vw_rotate |

## Installation Procedure Using Console APIs

User should connect to client devices’ console individually to setup the video wall. Please reference to “Console APIs” document for the usage of console.

Following command example applies to general video wall in video wall API v2,

# e e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_2

## General Case

| 1 X1 = 0 Y1 = 0 X2 = 2000 Y2 = 2000  #e e_vw_enable_0_0_2000_2000_2 | 2 X1 = 2000 Y1 = 2000 X2 = 3200 Y2 = 5600 and 270 degree clockwise rotate  #e e_vw_enable_2000_2000_3200_5600_2 #e e_vw_rotate_6 |

## MxN Video Wall

Consider about the border of display devices, the coordinates calculation should include the relations described below,

Following command example applies to MxN video wall with monitor dimension in video wall API v2,

# e e_vw_enable_${X1}_${Y1}_${X2}_${Y2}_2

The clients’ position be:

| R0C0 | R0C1 | R0C2 | ... | R0Cn |
| R1C0 | R1C1 | R1C2 | ... | R1Cn |
| R2C0 | R2C1 | R2C2 | ... | R2Cn |
| ... |
| RmC0 | RmC1 | RmC2 | ... | RmCn |

For the device located at row a, column b, RaCb:

X1’ = b * OW

Y1’ = a * OH

X2’ = b *OW + VW

Y2’ = a * OH + VH

Xtotal: n * OW + VW

Ytotal: m * OH + VH

X1 = SCALE * X1’/ Xtotal

Y1 = SCALE * Y1’ / Ytotal

X2 = SCALE * X2’ / Xtotal

Y2 = SCALE * Y2’ / Ytotal

a: 0 ~m, m=M-1; b: 0~n, n=N-1; SCALE=10000

## 2x2 Video Wall

OW=200, VW=190, OH=100, VH=90

The clients’ position and commands will be:

| r0c0: X1 = 0 Y1 = 0 X2 = 4871 Y2 = 4736  #e e_vw_enable_0_0_4871_4736_2 | r0c1: X1 = 5128 Y1 = 0 X2 = 10000 Y2 = 4736  #e e_vw_enable_5128_0_10000_4736_2 |
| r1c0: X1 = 0 Y1 = 5263 X2 = 4871 Y2 = 10000  #e e_vw_enable_0_5263_4871_10000_2 | r1c1: X1 = 5128 Y1 = 5263 X2 = 10000 Y2 = 10000  #e e_vw_enable_5128_5263_10000_10000_2 |

## 3x3 Video Wall

OW=200, VW=190, OH=100, VH=90

The clients’ position and commands will be:

| r0c0: X1 = 0 Y1 = 0 X2 = 3220 Y2 = 3103  #e e_vw_enable_0_0_3220_3103_2 | r0c1: X1 = 3389 Y1 = 0 X2 = 6610 Y2 = 3103  #e e_vw_enable_3389_0_6610_3103_2 | r0c2: X1 = 6779 Y1 = 0 X2 = 10000 Y2 = 3103  #e e_vw_enable_6779_0_10000_3103_2 |
| r1c0: X1 = 0 Y1 = 3448 X2 = 3220 Y2 = 6551  #e e_vw_enable_0_3448_3220_6551_2 | r1c1: X1 = 3389 Y1 = 3448 X2 = 6610 Y2 = 6551  #e e_vw_enable_3389_3448_6610_6551_2 | r1c2: X1 = 6779 Y1 = 3448 X2 = 10000 Y2 = 6551  #e e_vw_enable_6779_3448_10000_6551_2 |
| r2c0: X1 = 0 Y1 = 6896 X2 = 3220 Y2 = 10000  #e e_vw_enable_0_6896_3220_10000_2 | r2c1: X1 = 3389 Y1 = 6896 X2 =  6610 Y2 = 10000   #e e_vw_enable_3389_6896_6610_10000_2 | r2c2: X1 = 6779 Y1 = 6896 X2 = 10000 Y2 = 10000  #e e_vw_enable_6779_6896_10000_10000_2 |

## 1x3 Video Wall

OW=200, VW=190, OH=100, VH=90

The clients’ position and commands will be:

| r0c0: X1 = 0 Y1 = 0 X2 = 3220 Y2 = 10000  270 degrees clockwise rotate (monitor is 90 degrees clockwise rotate)  #e e_vw_enable_0_0_3220_10000_2 #e e_vw_rotate_6 | r0c1: X1 = 3389 Y1 = 0 X2 = 6610 Y2 = 10000  270 degrees clockwise rotate (monitor is 90 degrees clockwise rotate)  #e e_vw_enable_3389_0_6610_10000_2 #e e_vw_rotate_6 | r0c2: X1 = 6779 Y1 = 0 X2 = 10000 Y2 = 10000  270 degrees clockwise rotate (monitor is 90 degrees clockwise rotate)  #e e_vw_enable_6779_0_10000_10000_2 #e e_vw_rotate_6 |

## Mosaic Style Video Wall

Users have to calculate the position of each display area. Following is just an example for reference,

OW=1810, VW=1770, OH=1090, VH=1000 (in mm)

| 1 X1 = 10000 * ((6360/ 2) - (OH - VH)/2 - VH) ) / 6360 = 3356 Y1 = 0 X2 = 10000 * (((6360/ 2) - (OH - VH)/2)) / 6360) = 4929 Y2= 10000* ((3580 / 2) - ((OW - VW)/2)) / 3580 = 4944  270 degrees clockwise rotate (monitor is 90 degrees clockwise rotate)   #e e_vw_enable_3356_0_4939_4944_2 #e e_vw_rotate_6 | 2 X1 = 10000 * ((6360 /2) + (OW-VW)/2) / 6360 = 5031 Y1 = 10000 * (3580 /2 - (OH-VH)/2 - VH) / 3580 = 2081 X2 = 10000 * ((6360 /2) +  VW + (OW-VW)/2) / 6360 = 7814 Y2= 10000 * (3580 /2 - (OH-VH)/2) / 3580 = 4874    #e e_vw_enable_5031_2081_7814_4874_2 |
| 3 X1 = 10000 * (6360/ 2) - (OW - VW)/2 - VW) / 6360 = 2185 Y1 = 10000 * (3580/2 + (OH - VH)/2) / 3580 = 5125 X2 = 10000 * (6360/ 2) - (OW - VW)/2) / 6360 = 4968 Y2 = 10000 * (3580/2 + (OH - VH)/2 + VH) / 3580 = 7918  #e e_vw_enable_2185_5125_4968_7918_2 | 4 X1 = 10000 * (6360 /2 + (OH-VH)/2) / 6360 = 5070 Y1 = 10000 * (3580 /2 + (OW-VW)/2) / 3580 = 5055 X2 = 10000 * (6360 /2 + (OH-VH)/2 + VH) / 6360 = 6643 Y2 = 10000 * (3580 /2 + (OW-VW)/2 + VW) / 3580     = Ytotal/ Ytotal (where (OW-VW)/2 + VW = Ytotal/2) = 10000  270 degrees clockwise rotate  (monitor is 90 degrees clockwise rotate)  #e e_vw_enable_5070_5055_6643_10000_2 #e e_vw_rotate_6 |

## Limitations and Tips

See document, Video Wall Web Configuration Without RS232 Chain.