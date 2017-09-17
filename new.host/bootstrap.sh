#!/bin/sh


# Instalar RDP com
# https://aws.amazon.com/pt/premiumsupport/knowledge-center/connect-to-linux-desktop-from-windows/

sudo apt-get install git build-essential gitk gdb tcl8.5 arandr curl tmux vim mc tig openssh*  p7zip-full
sudo apt-get install language-pack-en-base
sudo dpkg-reconfigure locales

sudo -E add-apt-repository ppa:webupd8team/java
sudo -E add-apt-repository ppa:webupd8team/sublime-text-3 
sudo -E apt-get update
sudo -E apt-get install oracle-java8-installer
sudo -E apt-get install oracle-java8-set-default

#redis
sudo apt-get install tcl8.5
wget http://download.redis.io/releases/redis-2.8.9.tar.gz
tar xzf redis-2.8.9.tar.gz
cd redis-2.8.9
make
make test
sudo make install
cd utils
sudo ./install_server.sh
cd 
sudo service redis_6379 start

#heroku ToolBelt
wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh

sudo apt-get install nodejs
sudo apt-get install npm
sudo ln -s /usr/bin/nodejs ps -AH A

sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' 
sudo apt-get update  
sudo apt-get install google-chrome-stable  

sudo apt-get install sublime-text-installer

# Ver como pegar o eclipse

wget http://www.benckesoftware.com.br/eclipse-java-luna-SR1-linux-gtk-x86_64.tar.gz
tar xzf eclipse-java-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.java
ln -s ~/eclipse.java/eclipse ~/eclipse-java

wget http://www.benckesoftware.com.br/eclipse-cpp-luna-SR1-linux-gtk-x86_64.tar.gz
tar xzf eclipse-cpp-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.cpp
ln -s ~/eclipse.cpp/eclipse ~/eclipse-cpp

mkdir git
cd git
git clone https://benckesoftware@bitbucket.org/benckesoftware/benckesoftware.git
cd
cp /home/gbencke/git/benckesoftware/certs/id_rsa* ~/
mkdir ~/.ssh
echo "Host www.benckesoftware.com.br
IdentityFile ~/id_rsa_gitlab" > ~/.ssh/config
chmod 400 ~/.ssh/config
chmod 400 /home/gbencke/id_rsa_gitlab
git config --global user.name "Guilherme Bencke"
git config --global user.email gbencke@benckesoftware.com.br
git config --global push.default simple


# instalar o nodeclipse: http://www.nodeclipse.org/updates/anide/

# Ver como sempre deixar o fundo preto...

echo "[Desktop Entry]
Version=1.0
Name=Google Chrome
GenericName=Web Browser
Comment=Access the Internet
Exec=/usr/bin/google-chrome-stable %U
Terminal=false
Icon=google-chrome
Type=Application
Categories=Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml_xml;image/webp;x-scheme-handler/http;x-scheme-handler/https;x-scheme-handler/ftp;
X-Ayatana-Desktop-Shortcuts=NewWindow;NewIncognito

[NewWindow Shortcut Group]
Name=New Window
Exec=/usr/bin/google-chrome-stable
TargetEnvironment=Unity

[NewIncognito Shortcut Group]
Name=New Incognito Window
Exec=/usr/bin/google-chrome-stable --incognito
TargetEnvironment=Unity" > ~/Desktop/google-chrome.desktop

echo "[Desktop Entry]
Encoding=UTF-8
Name=LXTerminal
GenericName=Terminal
Comment=Use the command line
TryExec=lxterminal
Exec=lxterminal
Icon=lxterminal
Type=Application
Categories=GTK;Utility;TerminalEmulator;" > ~/Desktop/lxterminal.desktop

echo "[Desktop Entry]
Version=1.0
Type=Application
Name=Sublime Text
GenericName=Text Editor
Comment=Sophisticated text editor for code, markup and prose
Exec=/opt/sublime_text/sublime_text %F
Terminal=false
MimeType=text/plain;
Icon=sublime-text
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
[Desktop Action Window]
Name=New Window
Exec=/opt/sublime_text/sublime_text -n
OnlyShowIn=Unity;
[Desktop Action Document]
Name=New File
Exec=/opt/sublime_text/sublime_text --command new_file
OnlyShowIn=Unity;" > ~/Desktop/sublime-text.desktop

echo "[Desktop Entry]
Version=4.0
Type=Application
Name=Eclipse Java
GenericName=Eclipse IDE
Comment=Sophisticated IDE
Exec=/home/gbencke/eclipse-java
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/eclipse.java/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.desktop

echo "[Desktop Entry]
Version=4.0
Type=Application
Name=Eclipse C++
GenericName=Eclipse IDE C++
Comment=Sophisticated IDE C++
Exec=/home/gbencke/eclipse-cpp
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/eclipse.cpp/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.cpp.desktop


