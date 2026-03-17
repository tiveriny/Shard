<?php
$qs = [];
parse_str("r=messages%2F123", $qs);
var_dump($qs['r']);
