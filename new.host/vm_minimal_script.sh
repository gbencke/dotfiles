# Script for the configuration of a generic terminal only VM on AWS
# Uses Ubuntu 16.04 and is mostly used for jupyter notebooks servers

#!/bin/bash

sudo apt-get update;

sudo apt-get install -y net-tools git build-essential curl tmux vim mc tig openssh* 
sudo apt-get install -y p7zip-full htop vim mc tig git make gcc curl tmux wget python-pip 
sudo apt-get install -y ncurses-dev tree python-dev nano dos2unix bc libhdf5-dev    
sudo apt-get install -y python3 python3-pip python3-dev cmake graphviz python-h5py
sudo apt-get install -y exuberant-ctags python3-tk


sudo apt-get install -y language-pack-en-base 
sudo dpkg-reconfigure locales


git config --global user.email "gbencke@benckesoftware.com.br"  
git config --global user.name "Guilherme Bencke"  
git config --global push.default simple

sudo pip install autopep8 pylint virtualenv pmm
sudo pip3 install autopep8 pylint virtualenv pmm

if [[ -z "${USE_CUDA}" ]]; then
        echo "not using cuda..."
else 
        # CUDA RUNTIME FOR GPU VMs - chmod 755 and run the file below
        wget https://developer.nvidia.com/compute/cuda/9.0/Prod/local_installers/cuda_9.0.176_384.81_linux-run  
        # CUDA RUNTIME FOR GPU VMs - Cuda Devel - unzip and run the .deb files with dpkg -i 
        wget https://s3.amazonaws.com/gbencke.kaggle/backup.7z   
fi
