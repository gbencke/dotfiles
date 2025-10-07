#!/bin/bash
# Tested with Base AMI: ami-0857dde146952200b

#NONINTERACTIVE
    sudo su
    pacman-key --init 
    pacman-key --populate 
    pacman -Sy --noconfirm archlinux-keyring 
    pacman -Syyu --noconfirm
    pacman -R --noconfirm vim
    pacman -Sy --noconfirm sudo git curl tmux gvim mc tig p7zip htop mc wget unzip zsh protobuf
    pacman -Sy --noconfirm tree nano dos2unix bc graphviz ctags gitui tldr base-devel
    pacman -Sy --noconfirm rsync ranger virtualgl  i3 i3status i3blocks sddm feh tigervnc ttf-inconsolata
    pacman -Sy --noconfirm w3m mediainfo libcaca highlight unrar scrot tidy shellcheck alacritty ttf-liberation
    pacman -Sy --noconfirm gtk2 xorg-xhost dmenu perl lsof libnotify libxss gtk3 nss go fakeroot
    pacman -Sy --noconfirm cmake make fuse libxslt jdk17-openjdk tk neovide xclip ruby rofi diffutils
    pacman -Sy --noconfirm fzf dust eza git-delta btop
  

    groupadd gbencke
    useradd -m -g gbencke  -s /bin/bash gbencke
    echo "gbencke  ALL=(ALL) ALL" >> /etc/sudoers

    curl https://pyenv.run | bash

    echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
    echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
    echo 'eval "$(pyenv init -)"' >> ~/.bashrc

    $SHELL

    pyenv install 3.13.1
    pyenv global 3.13.1

    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
    git config --global core.fileMode false
    git config --global credential.helper store
    git config --global core.excludesfile ~/.gitignoreGlobal
    git config --global http.sslVerify false 
    git config set --global core.pager delta
    git config set --global interactive.diffFilter "delta --color-only --features=interactive"
    git config set --global delta.features decorations
    git config set --global delta.interactive.keep-plus-minus-markers false
    git config set --global delta.decorations.commit-decoration-style "blue ol"
    git config set --global delta.decorations.commit-style raw
    git config set --global delta.decorations.file-style omit
    git config set --global delta.decorations.hunk-header-decoration-style "blue box"
    git config set --global delta.decorations.hunk-header-file-style red
    git config set --global delta.decorations.hunk-line-number-style '#067a00'
    git config set --global delta.decorations.hunk-header-style "file line-number syntax" 

    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python get-pip.py
    pip install flake8 autopep8 pylint virtualenv pmm cython pillow lxml chardet vim-vint neovim

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

#NONINTERACTIVE
    mkdir -p /var/git/000.INFRA
    mkdir ~/.vnc
    chmod 755 -R /var/git 
    chmod 755 /root
    cd /var/git/000.INFRA
    git clone https://github.com/gbencke/dotfiles/ /var/git/000.INFRA/dotfiles
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
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    git config --global user.email "gbencke@benckesoftware.com.br"  
    git config --global user.name "Guilherme Bencke"  
    git config --global push.default simple
    git config --global core.editor vim
    git config --global core.fileMode false
    git config --global credential.helper store
    git config set --global core.pager delta
    git config set --global interactive.diffFilter "delta --color-only --features=interactive"
    git config set --global delta.features decorations
    git config set --global delta.interactive.keep-plus-minus-markers false
    git config set --global delta.decorations.commit-decoration-style "blue ol"
    git config set --global delta.decorations.commit-style raw
    git config set --global delta.decorations.file-style omit
    git config set --global delta.decorations.hunk-header-decoration-style "blue box"
    git config set --global delta.decorations.hunk-header-file-style red
    git config set --global delta.decorations.hunk-line-number-style '#067a00'
    git config set --global delta.decorations.hunk-header-style "file line-number syntax" 
  
    curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
    python get-pip.py
    pip install flake8 autopep8 pylint virtualenv pmm cython pillow lxml chardet vim-vint neovim
        
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
    cp /var/git/000.INFRA/dotfiles/new.host/xterm/Xresources ~/.Xresources

    sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
    $SHELL

#NONINTERACTIVE 
    mkdir -p ~/git.work/000.INFRA
    cd ~/git.work/000.INFRA
    git clone https://github.com/gbencke/dotfiles.git
    git clone https://aur.archlinux.org/nerd-fonts-complete.git
    git clone https://aur.archlinux.org/jetbrains-toolbox.git
    git clone https://aur.archlinux.org/google-chrome.git

    cd ~/git.work/000.INFRA/dotfiles/vim/
    ./switch_vimrc.sh js

    mkdir -p ~/.config/i3/
    cp /var/git/000.INFRA/dotfiles/new.host/arch/vnc/i3config ~/.config/i3/config
    sudo systemctl start vncserver@:1.service
    sudo systemctl start vncserver@:2.service
    sudo systemctl enable vncserver@:1.service
    sudo systemctl enable vncserver@:2.service

    cd ~/git.work/000.INFRA/google-chrome
    makepkg
    sudo pacman -U *.zst

    cd ~/git.work/000.INFRA/jetbrains-toolbox
    makepkg
    sudo pacman -U *.zst
  
    git clone https://github.com/NvChad/starter ~/.config/nvim && nvim
    npm install -g neovim
    npm install -g @builder.io/ai-shell
    ai config set OPENAI_KEY=<your token>
  


