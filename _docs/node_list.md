## Table of Contents:

## Overview

This document describes the details about console API command ‘node_list’. ‘node_list’ is used to query AST15XX device status in the same LAN. Every AST15XX device has built-in a software application which always listen to ‘node_list’ query commands from the network. Once AST15XX device received the query command, it will reply it own status. ‘node_list’ is response to send the query command and gather the response from all AST15XX devices.

Please see the ‘node_list’ sample C code for details.

## Commands

Command:

node_list [-t host|client] [-j]

Parameters:

-t host | client : Specify query device type. Query host only or query client only.

-j : Uses JSON as output format. Used for web API.

## Data Flow and Format

Note: All of following data structure/formats use 32bits Little Endian.

N1: node_list prepare a query packet using below C data structure:

typedef struct _query_struct_

{

AST_Device_Type	device_type;

AST_Device_Function	device_function;

} query_struct, *pquery_struct;

Please see sample code: name_service.h for details

N2: node_list send out the query packet. Using UDP in multicast format.

multicast IP: 225.1.0.0

destination port: 3333

R2: reply status using following C data structure:

#define MAX_STATUS_LENGTH 32

#define MAX_NAME_LENGTH 256

typedef struct _reply_struct_

{

AST_Device_Type	device_type;

AST_Device_Function	device_function;

char device_status[MAX_STATUS_LENGTH];

char device_name[MAX_NAME_LENGTH];

} reply_struct, *preply_struct;

Please see sample code: name_service.h for details

N3: node_list receive the reply from following UDP port: (Note: it is unicast)

destination port: 3334