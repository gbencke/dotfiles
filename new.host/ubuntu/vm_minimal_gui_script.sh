# Minimal Script for the creating of a VNC-based AWS Instance accessible with VNC
# Make sure to enable all ports used by VNC on AWS Console (ports:5900-6000)
# Ubuntu 16.04 based

#!/bin/sh

source ./vm_minimal_script.sh

sudo apt-get update  
sudo apt-get -y install xfce4 xfce4-goodies tightvncserver

vncserver -geometry 1440x990

cp -f ~/git/dotfiles/vnc/xstartup ~/.vnc/xstartup

