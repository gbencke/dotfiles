#!/bin/bash
# Tested with Base AMI: ami-0f5bb9b38ff51f079

#NONINTERACTIVE
    sudo pacman -Q archlinux-keyring
    sudo pacman -Sy --noconfirm archlinux-keyring 
    sudo pacman-key --populate archlinux
    sudo pacman -Sy --noconfirm archlinux-keyring && pacman -Syyu
    sudo pacman -Sy --noconfirm sudo git git-delta difftastic lazygit curl tmux vim mc tig p7zip htop mc wget unzip zsh protobuf base-devel bash
    sudo pacman -Sy --noconfirm tree nano dos2unix bc python python-pip cmake graphviz python-h5py ctags 
    sudo pacman -Sy --noconfirm rsync ranger go scrot tidy
    sudo pacman -Sy --noconfirm w3m mediainfo libcaca highlight poppler unrar tidy shellcheck jdk-openjdk

    sudo systemctl disable man-db.service
    sudo systemctl disable man-db.timer

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

    pip install flake8 autopep8 pylint virtualenv pmm cython pillow lxml pdftotext chardet vim-vint pyenv

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

#NONINTERACTIVE
    mkdir -p /var/git/000.INFRA
    mkdir ~/.vnc
    chmod 755 -R /var/git 
    chmod 755 /root
    cd /var/git/000.INFRA
    git clone http://github.com/gbencke/dotfiles/
    cp -r /var/git/000.INFRA/dotfiles/new.host/wallpaper ~/Wallpapers
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
    mkdir -p ~/.config/i3/
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
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
    cat /var/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
    cp /var/git/000.INFRA/dotfiles/shells/zshrc ~/.zshrc
    mkdir -p ~/.config/lazygit
    cp /var/git/000.INFRA/dotfiles/lazygit/config.yml ~/.config/lazygit/config.yml
    cp /var/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf
    sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
    $SHELL

