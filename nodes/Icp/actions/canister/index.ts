/**
 * n8n-nodes-icp: Canister Operations Index
 *
 * Copyright (c) 2025 Velocity BPA
 *
 * Licensed under the Business Source License 1.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://github.com/Velocity-BPA/n8n-nodes-icp/blob/main/LICENSE
 *
 * Change Date: 2029-01-01
 *
 * On the Change Date, this software will be made available under the
 * Apache License, Version 2.0.
 */

import * as queryOperation from './query.operation';
import * as updateOperation from './update.operation';
import * as statusOperation from './status.operation';
import * as installOperation from './install.operation';

export const query = queryOperation;
export const update = updateOperation;
export const status = statusOperation;
export const install = installOperation;
