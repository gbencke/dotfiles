# Minimal Script for the creating of a VNC-based AWS Instance accessible with VNC
# Make sure to enable all ports used by VNC on AWS Console
# Ubuntu 16.04 based

#!/bin/sh

sudo systemctl enable lightdm.service
sudo service lightdm.service start

sudo apt-get -y install xfce4 xfce4-goodies tightvncserver
sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' 
sudo apt-get update  
sudo apt-get install google-chrome-stable  

cp -f ~/git/dotfiles/vnc/xstartup ~/.vnc/xstartup

vncserver -geometry 1440x990


