#!/bin/bash

echo "Creating Summaries"
du * -sh | sort -h >> ./summaries.txt

