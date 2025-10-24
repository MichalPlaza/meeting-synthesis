#!/bin/bash

# This script assumes that 'mongod' is in your PATH.

# Create a data directory if it doesn't exist
mkdir -p mongo_data

# Start mongod, pointing to the local data directory
mongod --dbpath ./mongo_data
