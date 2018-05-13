#!/bin/bash

if test "$#" -ne 2;
      then echo 'Need to specify SWAP_SIZE and SWAP_FILE as $1, $2' ; exit -1
fi

export SIZE=$(bc <<< "1024 * 1024 * $1")
echo "Using SIZE=$SIZE"
sudo dd if=/dev/zero of=$2 bs=1024 count=$SIZE
sudo chmod 600 $2
sudo mkswap $2
sudo swapon $2

