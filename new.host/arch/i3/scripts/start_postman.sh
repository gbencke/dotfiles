#!/bin/sh

#origin	https://aur.archlinux.org/libvpx-git.git (fetch)
#origin	https://aur.archlinux.org/libvpx-git.git (push)
#origin	https://aur.archlinux.org/ffmpeg-git.git (fetch)
#origin	https://aur.archlinux.org/ffmpeg-git.git (push)

export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/home/gbencke/git/000.INFRA/ffmpeg-git/pkg/ffmpeg-git/usr/lib:/home/gbencke/git/000.INFRA/libvpx-git/pkg/libvpx-git/usr/lib

nohup postman 2> /dev/null 1> /dev/null & 

