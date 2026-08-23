<?php

return [
    'groups' => [
        'public' => [
            'feedback.*',
            'login',
            'password.*',
        ],
        'admin' => [
            '*', // Admins get access to all routes
        ],
    ],
];