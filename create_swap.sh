#!/bin/bash

export SIZE=$(bc <<< "1024 * 1024 * 10")
echo "Using SIZE=$SIZE"
sudo dd if=/dev/zero of=~/swapfile bs=1024 count=$SIZE
sudo chmod 600 ~/swapfile
sudo mkswap ~/swapfile
sudo swapon ~/swapfile

