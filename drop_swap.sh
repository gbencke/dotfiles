#!/bin/bash

if test "$#" -ne 1;
      then echo 'Need to specify SWAP_FILE as $1' ; exit -1
fi

sudo swapoff $1 
sudo rm $1 
