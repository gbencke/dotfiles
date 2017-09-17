#!/bin/sh

sudo apt-get update
sudo apt-get install git build-essential gitk gdb tcl8.5 arandr curl tmux vim mc tig

#vim
curl -fLo /usr/share/vim/vim74/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

#get mongodb if necessary
curl -O http://downloads.mongodb.org/linux/mongodb-linux-x86_64-3.0.1.tgz
tar -zxvf mongodb-linux-x86_64-3.0.1.tgz
sudo mkdir -p /opt/mongodb
sudo cp -R -n mongodb-linux-x86_64-3.0.1/ /opt
sudo chmod -R 755 /opt/mongodb-linux-x86_64-3.0.1
sudo mkdir /data
sudo mkdir /data/db
sudo chmod -R 777 /data/db
export PATH=/opt/mongodb-linux-x86_64-3.0.1/bin:$PATH
echo "export PATH=/opt/mongodb-linux-x86_64-3.0.1/bin:$PATH" >> .bashrc
/opt/mongodb-linux-x86_64-3.0.1/bin/mongod &
wget http://robomongo.org/files/linux/robomongo-0.8.5-x86_64.deb
#instalar via o installer do debian



#get redis if necessary
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


#Install node latest version
wget http://nodejs.org/dist/v0.12.2/node-v0.12.2.tar.gz
tar xzf node-v0.12.2.tar.gz
cd node-v0.12.2
./configure
sudo make clean install
sudo rm /usr/bin/node
sudo ln -s /usr/local/bin/node /usr/bin/node


# Install Node Eclipse (http://www.nodeclipse.org/updates/)
wget ftp://mirror.csclub.uwaterloo.ca/eclipse/technology/epp/downloads/release/mars/M6/eclipse-java-mars-M6-linux-gtk-x86_64.tar.gz
tar xzf eclipse-java-mars-M6-linux-gtk-x86_64.tar.gz
mv eclipse eclipse.node
ln -s ~/eclipse.node/eclipse ~/eclipse-node
sudo npm install -g npm 
sudo npm install -g nodeclipse
sudo npm install -g express-generator
sudo npm install -g express
sudo npm install -g grunt
sudo npm install -g bower
sudo npm install -g grunt-cli
sudo npm install -g yo
sudo npm install -g generator-angular-fullstack
sudo npm install -g karma
sudo npm install -g karma-cli
sudo npm install -g node-inspector
sudo npm install -g protractor
sudo npm install -g jscs 
sudo npm install -g mocha  


# Install Java Eclipse
wget http://www.benckesoftware.com.br/eclipse-jee-luna-SR1a-linux-gtk-x86_64.tar.gz #specific version for j2ee
tar xzf eclipse-java-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.java
ln -s ~/eclipse.java/eclipse ~/eclipse-java


# Install C++ Eclipse
wget http://www.benckesoftware.com.br/eclipse-cpp-luna-SR1-linux-gtk-x86_64.tar.gz
tar xzf eclipse-cpp-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.cpp
ln -s ~/eclipse.cpp/eclipse ~/eclipse-cpp

# Install Python Eclipse (http://pydev.org/updates)
tar xzf eclipse-java-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.python
ln -s ~/eclipse.python/eclipse ~/eclipse-python

# Install Force.com Eclipse (http://media.developerforce.com/force-ide/eclipse42)
tar xzf eclipse-java-luna-SR1-linux-gtk-x86_64.tar.gz 
mv eclipse eclipse.force
ln -s ~/eclipse.force/eclipse ~/eclipse-force


mkdir git
cd git
git clone https://benckesoftware@bitbucket.org/benckesoftware/benckesoftware.git
cd
cp ~/git/benckesoftware/certs/id_rsa* ~/
mkdir ~/.ssh
echo "Host www.benckesoftware.com.br"    > ~/.ssh/config
echo "   IdentityFile ~/id_rsa_gitlab"  >> ~/.ssh/config
echo "Host gitlab.com"    > ~/.ssh/config
echo "   IdentityFile ~/id_rsa_gitlab"  >> ~/.ssh/config
chmod 400 ~/.ssh/config
chmod 400 ~/id_rsa_gitlab
git config --global user.name "Guilherme Bencke"
git config --global user.email gbencke@benckesoftware.com.br
git config --global push.default simple
rm -rf ~/git/benckesoftware

# instalar o nodeclipse: http://www.nodeclipse.org/updates/anide/
# Install Force.com Eclipse (http://media.developerforce.com/force-ide/eclipse42)

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
Name=Eclipse Node
GenericName=Eclipse IDE Node
Comment=Sophisticated IDE Node 
Exec=/home/gbencke/eclipse-node
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/eclipse.node/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.node.desktop


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

echo "[Desktop Entry]
Version=4.0
Type=Application
Name=Eclipse Python
GenericName=Eclipse IDE Python
Comment=Sophisticated IDE Python
Exec=/home/gbencke/eclipse-python
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/eclipse.python/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.python.desktop

echo "[Desktop Entry]
Version=4.0
Type=Application
Name=Eclipse Force.com
GenericName=Eclipse IDE Force.com
Comment=Sophisticated IDE Force.com
Exec=/home/gbencke/eclipse-force
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/eclipse.force/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.force.desktop


echo "[Desktop Entry]
Type=Application
Exec=robomongo
Name=Robomongo
GenericName=MongoDB management tool
Icon=robomongo.png
Terminal=false
Categories=Development;IDE;mongodb;
" > ~/Desktop/robomongo.desktop

echo "[Desktop Entry]
Version=4.0
Type=Application
Name=Eclipse Installer
GenericName=Eclipse Installer
Comment=Installer for All Eclipse Variants
Exec=/home/gbencke/Downloads/eclipse-installer/eclipse-inst
Terminal=false
MimeType=text/plain;
Icon=/home/gbencke/Downloads/eclipse-installer/icon.xpm
Categories=TextEditor;Development;Utility;
StartupNotify=true
Actions=Window;Document;
X-Desktop-File-Install-Version=0.22
" > ~/Desktop/eclipse.installer


echo "

call plug#begin('~/.vim/plugged')

Plug 'junegunn/vim-easy-align'
Plug 'https://github.com/junegunn/vim-github-dashboard.git'
Plug 'https://github.com/junegunn/vim-plug.git'
Plug 'https://github.com/tpope/vim-fugitive.git'
Plug 'https://github.com/scrooloose/syntastic.git'
Plug 'SirVer/ultisnips' | Plug 'honza/vim-snippets'
Plug 'scrooloose/nerdtree', { 'on':  'NERDTreeToggle' }

call plug#end()

if has('statusline')
      set laststatus=2
      set statusline=%<%f\    
      set statusline+=%w%h%m%r 
      set statusline+=%{fugitive#statusline()} 
      set statusline+=\ [%{&ff}/%Y]            
      set statusline+=\ [%{getcwd()}]          
      set statusline+=%#warningmsg#
      set statusline+=%{SyntasticStatuslineFlag()}
      set statusline+=%*
      let g:syntastic_enable_signs=1
      set statusline+=%=%-14.(%l,%c%V%)\ %p%%  
endif
" > ~/.vimrc

