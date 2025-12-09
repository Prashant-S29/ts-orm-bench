#!/bin/bash

echo "======================================"
echo "System Specifications"
echo "======================================"
echo ""

echo "CPU:"
lscpu | grep "Model name" | sed 's/Model name: */  /'
lscpu | grep "CPU(s):" | head -1 | sed 's/CPU(s): */  Cores: /'
lscpu | grep "Thread(s)" | sed 's/Thread(s) per core: */  Threads per core: /'
lscpu | grep "CPU max MHz" | sed 's/CPU max MHz: */  Max MHz: /'
echo ""

echo "RAM:"
free -h | grep "Mem:" | awk '{print "  Total: " $2}'
echo ""

echo "Storage:"
lsblk -d -o name,rota,size,model | grep -v "loop" | sed 's/^/  /'
echo ""

echo "OS:"
cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2 | sed 's/^/  /'
echo ""

echo "Node.js:"
echo "  $(node --version)"
echo ""

echo "PostgreSQL:"
docker exec orm-benchmark-db psql -U benchmark -d benchmark -c "SELECT version();" 2>/dev/null | grep PostgreSQL | sed 's/^/  /' || echo "  Docker container not running"
echo ""

echo "Network:"

# Get default interface
DEFAULT_IF=$(ip route | grep default | awk '{print $5}' | head -1)
echo "  Default Interface: $DEFAULT_IF"

# Check connection type
if [[ -d "/sys/class/net/$DEFAULT_IF/wireless" ]]; then
    echo "  Type: WiFi"
    # WiFi details
    SSID=$(nmcli -t -f active,ssid dev wifi 2>/dev/null | grep '^yes' | cut -d: -f2)
    if [ ! -z "$SSID" ]; then
        echo "  Connected to: $SSID"
    fi
    # Link speed
    LINK_SPEED=$(iwconfig $DEFAULT_IF 2>/dev/null | grep "Bit Rate" | awk -F'=' '{print $2}' | awk '{print $1 " " $2}')
    if [ ! -z "$LINK_SPEED" ]; then
        echo "  Link Speed: $LINK_SPEED"
    else
        echo "  Link Speed: Not available"
    fi
    # Signal strength
    SIGNAL=$(iwconfig $DEFAULT_IF 2>/dev/null | grep "Signal level" | awk -F'=' '{print $3}' | awk '{print $1}')
    if [ ! -z "$SIGNAL" ]; then
        echo "  Signal Strength: $SIGNAL"
    fi
else
    echo "  Type: Ethernet"
    # Ethernet speed and duplex
    if command -v ethtool &> /dev/null; then
        SPEED=$(sudo ethtool $DEFAULT_IF 2>/dev/null | grep "Speed:" | awk '{print $2}')
        DUPLEX=$(sudo ethtool $DEFAULT_IF 2>/dev/null | grep "Duplex:" | awk '{print $2}')
        if [ ! -z "$SPEED" ]; then
            echo "  Link Speed: $SPEED"
        fi
        if [ ! -z "$DUPLEX" ]; then
            echo "  Duplex: $DUPLEX"
        fi
    else
        echo "  Link Speed: ethtool not available"
    fi
fi

# Get IP address
IP_ADDR=$(ip addr show $DEFAULT_IF 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1)
if [ ! -z "$IP_ADDR" ]; then
    echo "  IP Address: $IP_ADDR"
fi

# Docker network (since DB is in Docker)
DOCKER_SUBNET=$(docker network inspect bridge 2>/dev/null | grep -A 2 '"Subnet"' | grep Subnet | awk -F'"' '{print $4}')
if [ ! -z "$DOCKER_SUBNET" ]; then
    echo "  Docker Bridge: $DOCKER_SUBNET"
else
    echo "  Docker Bridge: Not available"
fi

# Connection to database (localhost)
echo "  Database Connection: localhost:5432 (Docker bridge)"

echo ""
echo "======================================"
echo ""