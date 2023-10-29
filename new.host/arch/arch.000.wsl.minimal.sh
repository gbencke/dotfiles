#!/bin/bash
# Tested with Base AMI: ami-05556d2b8bbf0ae30

#NONINTERACTIVE
    sudo su
    pacman-key --init 
    pacman-key --populate 
    pacman -Sy --noconfirm archlinux-keyring 
    pacman -Syyu --noconfirm
    pacman -R --noconfirm vim
    pacman -Sy --noconfirm sudo git curl tmux vim mc tig p7zip htop mc wget unzip zsh protobuf aws-cli-v2
    pacman -Sy --noconfirm tree nano dos2unix bc graphviz gitui tldr
    pacman -Sy --noconfirm rsync unrar base-devel
    pacman -Sy --noconfirm cmake make fuse neovide ruby rofi
	
    groupadd gbencke
    useradd -m -g gbencke  -s /bin/bash gbencke
    echo "gbencke  ALL=(ALL) ALL" >> /etc/sudoers

    curl https://pyenv.run | bash

    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
    echo 'eval "$(pyenv init -)"' >> ~/.bashrc

    $SHELL

    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
    git config --global core.fileMode false
    git config --global credential.helper store
    git config --global core.excludesfile ~/.gitignoreGlobal
    git config --global http.sslVerify false 

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

#NONINTERACTIVE
    mkdir -p /var/git/000.INFRA
    chmod 755 -R /var/git 
    chmod 755 /root
    cd /var/git/000.INFRA
    git clone http://github.com/gbencke/dotfiles/
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc

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
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
    git config --global core.fileMode false
    git config --global credential.helper store
	
#INTERACTIVE
    unset ZSH
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

#NONINTERACTIVE 
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
    cat /var/git/000.INFRA/dotfiles/shells/zshrc >> ~/.zshrc
    cp /var/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf

    sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
    $SHELL

#NONINTERACTIVE 
    mkdir -p ~/git.work/000.INFRA
    cd ~/git.work/000.INFRA
    git clone https://github.com/gbencke/dotfiles.git

    cd ~/git.work/000.INFRA/dotfiles/vim/
    ./switch_vimrc.sh js

