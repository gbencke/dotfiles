#!/bin/bash
# Tested with Base AMI: ami-0857dde146952200b

#NONINTERACTIVE
    sudo su
    sudo pacman-key --init 
    sudo pacman-key --populate archlinux
    sudo pacman -Sy --noconfirm archlinux-keyring 
    sudo pacman -Syu
    sudo pacman -Sy --noconfirm sudo git git-delta difftastic lazygit curl tmux vim mc tig p7zip htop mc wget unzip zsh protobuf
    sudo pacman -Sy --noconfirm tree nano dos2unix bc ctags 
    sudo pacman -Sy --noconfirm rsync virtualgl  i3 i3status i3blocks sddm feh tigervnc ttf-inconsolata
    sudo pacman -Sy --noconfirm w3m mediainfo libcaca highlight unrar scrot tidy alacritty ttf-liberation
    sudo pacman -Sy --noconfirm gtk2 xorg-xhost dmenu pyenv python-pip perl lsof libnotify libxss gtk3 nss
    sudo pacman -Sy --noconfirm cmake make fakeroot

    groupadd gbencke
    useradd -m -g gbencke  -s /bin/bash gbencke
    echo "gbencke  ALL=(ALL) ALL" >> /etc/sudoers

    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
    # Use Delta for Git output and Difftastic for explicit comparisons.
    git config --global core.pager delta
    git config --global pager.diff delta
    # Keep short diffs open and enable n/N navigation.
    git config --global delta.paging always
    git config --global delta.navigate true
    git config --global interactive.diffFilter "delta --color-only --features=interactive"
    git config --global diff.tool difftastic
    git config --global difftool.difftastic.cmd 'difft "$LOCAL" "$REMOTE"'
    git config --global difftool.prompt false
    # Remove the external diff override so Git produces patches for Delta.
    git config --global --unset-all diff.external || test "$?" -eq 5

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

#NONINTERACTIVE
    mkdir -p /var/git/000.INFRA
    mkdir ~/.vnc
    chmod 755 -R /var/git 
    chmod 755 /root
    cd /var/git/000.INFRA
    git clone http://github.com/gbencke/dotfiles/
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
    cp /var/git/000.INFRA/dotfiles/shells/zshrc ~/.zshrc
    mkdir -p ~/.config/lazygit
    cp /var/git/000.INFRA/dotfiles/lazygit/config.yml ~/.config/lazygit/config.yml
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
    # Use Delta for Git output and Difftastic for explicit comparisons.
    git config --global core.pager delta
    git config --global pager.diff delta
    # Keep short diffs open and enable n/N navigation.
    git config --global delta.paging always
    git config --global delta.navigate true
    git config --global interactive.diffFilter "delta --color-only --features=interactive"
    git config --global diff.tool difftastic
    git config --global difftool.difftastic.cmd 'difft "$LOCAL" "$REMOTE"'
    git config --global difftool.prompt false
    # Remove the external diff override so Git produces patches for Delta.
    git config --global --unset-all diff.external || test "$?" -eq 5
        
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
    cp /var/git/000.INFRA/dotfiles/shells/zshrc ~/.zshrc
    mkdir -p ~/.config/lazygit
    cp /var/git/000.INFRA/dotfiles/lazygit/config.yml ~/.config/lazygit/config.yml
    cp /var/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf
    cp /var/git/000.INFRA/dotfiles/new.host/xterm/Xresources ~/.Xresources

    sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
    $SHELL

#NONINTERACTIVE 
    mkdir -p ~/git.work/000.INFRA
    cd ~/git.work/000.INFRA
    git clone https://github.com/gbencke/dotfiles.git
    git clone https://aur.archlinux.org/visual-studio-code-bin.git
    git clone https://aur.archlinux.org/google-chrome.git

    mkdir -p ~/.config/i3/
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
    sudo systemctl start vncserver@:1.service
    sudo systemctl start vncserver@:2.service
    sudo systemctl enable vncserver@:1.service
    sudo systemctl enable vncserver@:2.service

    cd ~/git.work/000.INFRA/google-chrome
    makepkg
    sudo pacman -U *.zst

