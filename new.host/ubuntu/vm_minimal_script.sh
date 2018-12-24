# Script for the configuration of a generic terminal only VM on AWS
# Uses Ubuntu 16.04 and is mostly used for jupyter notebooks servers

#!/bin/bash

sudo apt-get update;

sudo apt-get install -y net-tools git build-essential curl tmux vim mc tig openssh* 
sudo apt-get install -y p7zip-full htop vim mc tig git make gcc curl tmux wget python-pip 
sudo apt-get install -y ncurses-dev tree python-dev nano dos2unix bc libhdf5-dev    
sudo apt-get install -y python3 python3-pip python3-dev cmake graphviz python-h5py
sudo apt-get install -y exuberant-ctags python3-tk rsync
sudo apt-get install -y xfce4 xfce4-goodies tightvncserver

sudo apt-get install -y language-pack-en-base 
sudo dpkg-reconfigure locales

pip3 install flake8 autopep8 pylint virtualenv pmm cython pillow lxml pdftotext chardet vim-vint

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

git config --global user.email "gbencke@benckesoftware.com.br"  
git config --global user.name "Guilherme Bencke"  
git config --global push.default simple
git config --global core.editor vim


if [[ -z "${USE_CUDA}" ]]; then
        echo "not using cuda..."
else 
        # CUDA RUNTIME FOR GPU VMs - chmod 755 and run the file below
        wget https://developer.nvidia.com/compute/cuda/9.0/Prod/local_installers/cuda_9.0.176_384.81_linux-run  
        # CUDA RUNTIME FOR GPU VMs - Cuda Devel - unzip and run the .deb files with dpkg -i 
        wget https://s3.amazonaws.com/gbencke.kaggle/backup.7z   
fi

mkdir -p ~/000.INFRA/git
cd ~/000.INFRA/git
git clone https://github.com/gbencke/dotfiles.git
mkdir -p ~/.config/termite
cp ~/000.INFRA/dotfiles/new.host/arch/termite/config ~/.config/termite/config
cp -r ~/000.INFRA/dotfiles/new.host/wallpaper ~/Wallpapers
cp ~/000.INFRA/dotfiles/new.host/arch/vnc/xstartup ~/.vnc/xstartup
cp ~/000.INFRA/dotfiles/new.host/arch/vnc/config ~/.vnc/config
vncserver -kill :1
vncserver

sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

cat ~/git/000.INFRA/dotfiles/shells/bashrc >> ~/.bashrc
cat ~/git/000.INFRA/dotfiles/shells/zshrc >> ~/.zshrc
cp ~/git/000.INFRA/dotfiles/new.host/tmux/.tmux.conf ~/.tmux.conf
sed -i -e 's/robbyrussell/clean/g' /home/gbencke/.zshrc
$SHELL


~/000.INFRA/git/npm/frontend.sh
~/000.INFRA/git/vim/switch_vim.sh python


cd
