
#!/bin/sh

sudo apt-get update
sudo apt-get install git build-essential gitk gdb tcl8.5 arandr curl tmux vim openssh* cowsay

sudo -E add-apt-repository ppa:webupd8team/java
sudo -E add-apt-repository ppa:webupd8team/sublime-text-3 
sudo -E apt-get update
sudo -E apt-get install oracle-java8-installer
sudo -E apt-get install oracle-java8-set-default

sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' 
sudo apt-get update  
sudo apt-get install google-chrome-stable  

curl -fLo /usr/share/vim/vim74/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim


#Download NODE e install

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

#Instalar Eclipser Installer
