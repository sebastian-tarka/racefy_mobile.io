import { ImageManipulator } from 'expo-image-manipulator';
import { stripImageMetadata, stripImagesMetadata } from '../imageMetadata';

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('../../services/logger', () => ({ logger: { warn: jest.fn() } }));

const manipulate = ImageManipulator.manipulate as jest.Mock;

/** A manipulator that "saves" to a new file, keeping the size it was resized to. */
function manipulator(source: { width: number; height: number }) {
  let size = { ...source };
  const rendered = {
    saveAsync: jest.fn(async ({ format }: { format: string }) => ({
      uri: `file:///cache/ImageManipulator/clean.${format === 'png' ? 'png' : 'jpg'}`,
      ...size,
    })),
    release: jest.fn(),
  };
  const context = {
    resize: jest.fn((next: { width: number; height: number }) => {
      size = next;
    }),
    renderAsync: jest.fn(async () => rendered),
  };
  manipulate.mockReturnValue(context);
  return { context, rendered };
}

beforeEach(() => manipulate.mockReset());

describe('stripImageMetadata', () => {
  it('returns a re-encoded copy, never the picked file', async () => {
    const { context, rendered } = manipulator({ width: 4000, height: 3000 });

    const clean = await stripImageMetadata({
      uri: 'file:///DCIM/IMG_0001.jpg',
      width: 4000,
      height: 3000,
    });

    expect(manipulate).toHaveBeenCalledWith('file:///DCIM/IMG_0001.jpg');
    expect(clean).toEqual({
      uri: 'file:///cache/ImageManipulator/clean.jpg',
      width: 4000,
      height: 3000,
    });
    expect(context.resize).not.toHaveBeenCalled();
    expect(rendered.saveAsync).toHaveBeenCalledWith({ compress: 0.9, format: 'jpeg' });
    expect(rendered.release).toHaveBeenCalled();
  });

  it('keeps PNG as PNG, for transparency', async () => {
    const { rendered } = manipulator({ width: 512, height: 512 });

    const clean = await stripImageMetadata({ uri: 'file:///logo.PNG', width: 512, height: 512 });

    expect(rendered.saveAsync).toHaveBeenCalledWith(expect.objectContaining({ format: 'png' }));
    expect(clean?.uri).toMatch(/\.png$/);
  });

  it('turns every other format into JPEG', async () => {
    const { rendered } = manipulator({ width: 100, height: 100 });

    await stripImageMetadata({ uri: 'file:///IMG_0002.HEIC', width: 100, height: 100 });

    expect(rendered.saveAsync).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' }));
  });

  it('downscales to the longer side when asked, keeping the proportions', async () => {
    const { context } = manipulator({ width: 4000, height: 3000 });

    const clean = await stripImageMetadata(
      { uri: 'file:///a.jpg', width: 4000, height: 3000 },
      { maxSide: 2048, quality: 0.85 },
    );

    expect(context.resize).toHaveBeenCalledWith({ width: 2048, height: 1536 });
    expect(clean).toMatchObject({ width: 2048, height: 1536 });
  });

  it('does not upscale a small image', async () => {
    const { context } = manipulator({ width: 800, height: 600 });

    await stripImageMetadata({ uri: 'file:///a.jpg', width: 800, height: 600 }, { maxSide: 2048 });

    expect(context.resize).not.toHaveBeenCalled();
  });

  it('gives nothing back when re-encoding fails — never the original', async () => {
    manipulate.mockImplementation(() => {
      throw new Error('decode failed');
    });

    await expect(
      stripImageMetadata({ uri: 'file:///broken.jpg', width: 1, height: 1 }),
    ).resolves.toBeNull();
  });

  it('releases the rendered image even when saving fails', async () => {
    const { rendered } = manipulator({ width: 10, height: 10 });
    rendered.saveAsync.mockRejectedValue(new Error('disk full'));

    await expect(
      stripImageMetadata({ uri: 'file:///a.jpg', width: 10, height: 10 }),
    ).resolves.toBeNull();
    expect(rendered.release).toHaveBeenCalled();
  });
});

describe('stripImagesMetadata', () => {
  it('keeps the order and counts what had to be left out', async () => {
    manipulate.mockImplementation((uri: string) => {
      if (uri.includes('broken')) throw new Error('decode failed');
      const rendered = {
        saveAsync: jest.fn(async () => ({ uri: `${uri}.clean.jpg`, width: 1, height: 1 })),
        release: jest.fn(),
      };
      return { resize: jest.fn(), renderAsync: jest.fn(async () => rendered) };
    });
    const image = (uri: string) => ({ uri, width: 1, height: 1 });

    const result = await stripImagesMetadata([
      image('file:///a.jpg'),
      image('file:///broken.jpg'),
      image('file:///b.jpg'),
    ]);

    expect(result.images.map((i) => i.uri)).toEqual([
      'file:///a.jpg.clean.jpg',
      'file:///b.jpg.clean.jpg',
    ]);
    expect(result.failed).toBe(1);
  });
});
