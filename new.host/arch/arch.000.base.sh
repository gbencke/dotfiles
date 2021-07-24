#!/bin/bash
# Tested with Base AMI: ami-0857dde146952200b

#NONINTERACTIVE
    sudo su
    sudo pacman -Q archlinux-keyring
    sudo pacman-key --populate archlinux
    sudo pacman -Sy --noconfirm archlinux-keyring 
    sudo pacman -Sy --noconfirm sudo git curl tmux vim mc tig p7zip htop mc wget unzip zsh protobuf
    sudo pacman -Sy --noconfirm tree nano dos2unix bc graphviz ctags 
    sudo pacman -Sy --noconfirm rsync ranger compton virtualgl  i3 i3status i3blocks sddm feh tigervnc ttf-inconsolata
    sudo pacman -Sy --noconfirm w3m mediainfo libcaca highlight unrar scrot tidy shellcheck alacritty
    sudo pacman -Sy --noconfirm gtk2 xorg-xhost dmenu pyenv python-pip perl vscode

    groupadd gbencke
    useradd -m -g gbencke  -s /bin/bash gbencke
    echo "gbencke  ALL=(ALL) ALL" >> /etc/sudoers

    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

#NONINTERACTIVE
    mkdir -p /var/git/000.INFRA
    mkdir ~/.vnc
    chmod 755 -R /var/git 
    chmod 755 /root
    cd /var/git/000.INFRA
    git clone http://github.com/gbencke/dotfiles/
    mkdir -p ~/.config/termite
    cp /var/git/000.INFRA/dotfiles/new.host/arch/termite/config ~/.config/termite/config
    cp -r /var/git/000.INFRA/dotfiles/new.host/wallpaper ~/Wallpapers
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
    mkdir -p ~/.config/i3/
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/vncserver.users /etc/tigervnc/vncserver.users

#INTERACTIVE
    vncpasswd ~/.vnc/passwd

#INTERACTIVE
    unset ZSH
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

#NONINTERACTIVE 
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
    cat /var/git/000.INFRA/dotfiles/shells/zshrc >> ~/.zshrc
    cp /var/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf
    sed -i -e 's/robbyrussell/clean/g' /root/.zshrc
    $SHELL

#INTERACTIVE    
    passwd gbencke
    su gbencke
        
#NONINTERACTIVE
    cd
    ln -s /var/git ~/git 
    unset NVM_DIR 2>/dev/null
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
        
#INTERACTIVE
    unset ZSH
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

#NONINTERACTIVE 
    mkdir ~/.vnc

#INTERACTIVE
    vncpasswd ~/.vnc/passwd

#NONINTERACTIVE 
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
    cat /var/git/000.INFRA/dotfiles/shells/zshrc >> ~/.zshrc
    cp /var/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf
    sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
    $SHELL

#NONINTERACTIVE 
    mkdir -p ~/git.work/000.INFRA
    cd ~/git.work/000.INFRA
    git clone https://github.com/gbencke/dotfiles.git
    git clone https://github.com/vim/vim.git
    git clone https://aur.archlinux.org/nerd-fonts-complete.git
    cp ~/git.work/000.INFRA/dotfiles/vim/build_vim.sh ~/git.work/000.INFRA/vim/
    sudo pip install neovim
    cd ~/git.work/000.INFRA/vim
    ./build_vim.sh
    cd ~/git.work/000.INFRA/dotfiles/vim/
    ./switch_vimrc.sh js
    mkdir -p ~/.config/i3/
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
    sudo systemctl start vncserver@:1.service
    sudo systemctl start vncserver@:2.service
    sudo systemctl enable vncserver@:1.service
    sudo systemctl enable vncserver@:2.service




