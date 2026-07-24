#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config.js');
const core = require('../ambo-core.js');

const ROOT = path.resolve(__dirname, '..');

function collectJsonFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectJsonFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
    });
}

function validateRegistry() {
    const registryPath = path.join(ROOT, config.data.managerRegistryPath);
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const errors = [];
    const canonicalIds = new Set();
    const userIds = new Set();

    for (const manager of registry.managers || []) {
        if (!manager.canonicalId) errors.push('manager sem canonicalId');
        if (canonicalIds.has(manager.canonicalId)) errors.push(`canonicalId repetido: ${manager.canonicalId}`);
        canonicalIds.add(manager.canonicalId);

        for (const userId of manager.sleeperUserIds || []) {
            if (userIds.has(String(userId))) errors.push(`Sleeper user_id repetido: ${userId}`);
            userIds.add(String(userId));
        }
    }

    return errors;
}

function main() {
    const snapshotRoot = path.join(ROOT, config.data.snapshotsBasePath);
    const files = collectJsonFiles(snapshotRoot)
        .filter(file => path.basename(file) !== 'manifest.json');
    const errors = validateRegistry();
    let leaguesValidated = 0;

    for (const file of files) {
        const relative = path.relative(ROOT, file);
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));

        if (payload.schemaVersion !== 1 || !Array.isArray(payload.leagues)) {
            errors.push(`${relative}: formato de snapshot inválido`);
            continue;
        }

        payload.leagues.forEach((league, index) => {
            const result = core.validateLeagueSnapshot(league);
            leaguesValidated += 1;
            if (!result.valid) {
                errors.push(`${relative}, liga ${index + 1}: ${result.errors.join('; ')}`);
            }
        });
    }

    if (errors.length) {
        console.error(errors.map(error => `✗ ${error}`).join('\n'));
        process.exitCode = 1;
        return;
    }

    if (files.length === 0) {
        console.log('✓ Estrutura válida. Nenhum snapshot oficial foi gerado ainda.');
        return;
    }

    console.log(`✓ ${files.length} snapshots e ${leaguesValidated} ligas validados.`);
}

main();
