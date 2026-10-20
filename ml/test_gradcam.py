import sys
import os
sys.path.insert(0, os.path.abspath("."))

import torch
import numpy as np
import cv2
from ml.architectures.cnn_spatial import CycloneSpatialCNN

m = CycloneSpatialCNN(1, 7)
m.eval()
x = torch.randn(1, 1, 64, 64, requires_grad=True)

# Register hook on features[12] (Conv2d 128 -> 256)
features = []
gradients = []

def forward_hook(module, inp, out):
    features.append(out)

def backward_hook(module, grad_in, grad_out):
    gradients.append(grad_out[0])

h1 = m.features[12].register_forward_hook(forward_hook)
h2 = m.features[12].register_full_backward_hook(backward_hook)

out = m(x)
logits = out["class_logits"]
pred_class = logits.argmax(dim=-1).item()

score = logits[0, pred_class]
score.backward()

h1.remove()
h2.remove()

act = features[0][0].detach().numpy() # (256, 8, 8)
grads = gradients[0][0].detach().numpy() # (256, 8, 8)

weights = np.mean(grads, axis=(1, 2)) # (256,)
cam = np.zeros(act.shape[1:], dtype=np.float32) # (8, 8)
for i, w in enumerate(weights):
    cam += w * act[i]

cam = np.maximum(cam, 0)
if np.max(cam) > 0:
    cam = cam / np.max(cam)

cam_resized = cv2.resize(cam, (64, 64))
print("Grad-CAM generated successfully! Shape:", cam_resized.shape, "Min:", cam_resized.min(), "Max:", cam_resized.max())
