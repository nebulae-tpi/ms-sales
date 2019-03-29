#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-tpi/emi --frontend-id=emi --output-dir=/home/nesas-12/Documents/projects/TPI/ms-sales/playground/emi  --setup-file=/home/nesas-12/Documents/projects/TPI/ms-sales/etc/mfe-setup.json

# API - GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-tpi/emi-gateway --api-id=emi-gateway --output-dir=/home/nesas-12/Documents/projects/TPI/ms-sales/playground/emi-gateway  --setup-file=/home/nesas-12/Documents/projects/TPI/ms-sales/etc/mapi-setup.json
