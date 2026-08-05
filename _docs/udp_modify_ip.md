方法：

向组播地址225.3.0.0:3335发送一组数据，数据结构见setting_struct，编解码器上电后会一直监听该地址，接收到数据发现mac地址是自已，则会修改自已的IP并重启设备。

目前是单向通讯，设备不返回确认信息。

#define AST_IP_SERVICE_QUERY_PORT 3335

#define AST_IP_SERVICE_REPLY_PORT 3336

#define AST_IP_SERVICE_GROUP_ADDR "225.3.0.0"

typedef struct _setting_struct_

{

char mac[20];			// mac地址不带 :

char ip_mode[20];		// 'static' 'dhcp'

char ip[20];

char netmask[20];

char gateway[20];

}setting_struct;

int ast_multicast_ip_setting(setting_struct *setting)

{

int q_fd;

struct sockaddr_in addr;

socklen_t addr_len = sizeof(addr);

char grp_addr[] = AST_IP_SERVICE_GROUP_ADDR;

q_fd = udp_create_sender();

if (q_fd > 0)

{

memset(&addr, 0, sizeof(addr));

addr.sin_family = AF_INET;

addr.sin_addr.s_addr = inet_addr(grp_addr);

addr.sin_port = htons(AST_IP_SERVICE_QUERY_PORT);

sendto(q_fd, setting, sizeof(setting_struct), 0, (struct sockaddr *)&addr, addr_len);

close(q_fd);

return 1;

}

return 0;

}

int udp_create_sender(void)

{

struct sockaddr_in addr;

int fd;

struct ifreq net_interface;

#define INTERFAXENAME "eth0.2"

//int optval = 1;

//struct ip_mreq mreq;

//int yes = 1;

/* create what looks like an ordinary UDP socket */

if ((fd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {

perror("socket");

return -1;

}

/* set up bind address */

memset(&addr, 0, sizeof(struct sockaddr_in));

addr.sin_family = AF_INET;

addr.sin_addr.s_addr = htonl(INADDR_ANY);

addr.sin_port = htons(0);

/*

if (setsockopt(fd, SOL_SOCKET, SO_BROADCAST, (void *)&optval, sizeof(optval)) == -1)

{

perror("s udp broadcast err");

return -1;

}

*/

strncpy(net_interface.ifr_ifrn.ifrn_name, INTERFAXENAME, sizeof(INTERFAXENAME));

if (setsockopt(fd, SOL_SOCKET, SO_BINDTODEVICE, (char *)&net_interface, sizeof(net_interface))  < 0) {

perror("SO_BINDTODEVICE failed");

}

/* bind to send address */

if (bind(fd, (struct sockaddr *)&addr, sizeof(struct sockaddr_in)) < 0) {

perror("bind");

return -1;

}

return fd;

}

测试用例一：

setting_struct setting;

memset(&setting, 0, sizeof(setting_struct));

strcpy(setting.mac, “6CDFFB002030”);

strcpy(setting.ip_mode, "static");

strcpy(setting.ip, “192.168.3.10”);

strcpy(setting.netmask, “255.255.255.0”);

strcpy(setting.gateway, “192.168.3.1”);

ast_multicast_ip_setting(&setting);

测试用例二：

setting_struct setting;

memset(&setting, 0, sizeof(setting_struct));

strcpy(setting.mac, “6CDFFB002030”);

strcpy(setting.ip_mode, "dhcp");

ast_multicast_ip_setting(&setting);