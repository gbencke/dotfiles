#!/bin/bash

make clean
sleep 1

./configure --with-features=huge \
							--enable-multibyte \
							--enable-rubyinterp=yes \
							--enable-pythoninterp=yes \
							--with-python-config-dir=/usr/lib/python2.7/config \
							--enable-python3interp=yes \
							--with-python3-config-dir=/usr/lib/python3.6/config \
							--enable-perlinterp=yes \
							--enable-luainterp=yes \
							--enable-gui=gtk2 \
							--enable-cscope \
							--prefix=/usr/local

sleep 1
sudo make install 
