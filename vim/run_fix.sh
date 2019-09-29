#!/bin/bash

function check_dir () {
        if [ -d 'node_modules' ]; then
                npm run fix
                exit  0
        fi

        if [ -d 'git' ]; then
                echo 'found git root'
                exit 0
        fi
        cd ..
        check_dir
}

check_dir

